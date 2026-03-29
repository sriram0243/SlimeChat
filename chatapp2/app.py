from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from werkzeug.security import generate_password_hash, check_password_hash
import mysql.connector
import os
from datetime import datetime
from functools import wraps

app = Flask(__name__)
app.secret_key = 'slime-king-rimuru-tempest-secret-2024'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# ─── DB Config ─────────────────────────────────────────────────────────────────
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',           # ← Change to your MySQL username
    'password': 'root',           # ← Change to your MySQL password
    'database': 'chat_app',
    'charset': 'utf8mb4',
    'autocommit': True
}

online_users = {}  # {user_id: socket_id}

# ─── DB Helpers ────────────────────────────────────────────────────────────────
def get_db():
    return mysql.connector.connect(**DB_CONFIG)

def init_db():
    cfg = DB_CONFIG.copy()
    cfg.pop('database')
    conn = mysql.connector.connect(**cfg)
    cursor = conn.cursor()
    cursor.execute("CREATE DATABASE IF NOT EXISTS chatapp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
    cursor.close()
    conn.close()

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sender_id INT NOT NULL,
            receiver_id INT NOT NULL,
            message TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_sender_receiver (sender_id, receiver_id),
            INDEX idx_created_at (created_at)
        )
    """)
    cursor.close()
    conn.close()
    print("✅ Database initialized.")

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated

# ─── Routes ────────────────────────────────────────────────────────────────────
@app.route('/')
@login_required
def index():
    return redirect(url_for('chat'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    if 'user_id' in session:
        return redirect(url_for('chat'))
    error = None
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        if not username or not password:
            error = 'Username and password are required.'
        elif len(username) < 3:
            error = 'Username must be at least 3 characters.'
        elif len(password) < 4:
            error = 'Password must be at least 4 characters.'
        else:
            try:
                conn = get_db()
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO users (username, password) VALUES (%s, %s)",
                    (username, password)
                )
                user_id = cursor.lastrowid
                cursor.close()
                conn.close()
                session['user_id'] = user_id
                session['username'] = username
                return redirect(url_for('chat'))
            except mysql.connector.IntegrityError:
                error = 'Username already taken.'
            except Exception as e:
                error = f'Registration failed: {str(e)}'
    return render_template('register.html', error=error)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_id' in session:
        return redirect(url_for('chat'))
    error = None
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        if not username or not password:
            error = 'Enter username and password.'
        else:
            try:
                conn = get_db()
                cursor = conn.cursor(dictionary=True)
                cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
                user = cursor.fetchone()
                cursor.close()
                conn.close()
                if user and user['password'] == password:
                    session['user_id'] = user['id']
                    session['username'] = user['username']
                    return redirect(url_for('chat'))
                else:
                    error = 'Invalid username or password.'
            except Exception as e:
                error = f'Login failed: {str(e)}'
    return render_template('login.html', error=error)

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/chat')
@login_required
def chat():
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, username FROM users WHERE id != %s ORDER BY username",
            (session['user_id'],)
        )
        users = cursor.fetchall()
        cursor.close()
        conn.close()
    except Exception as e:
        users = []
    return render_template('chat.html',
                           users=users,
                           current_user_id=session['user_id'],
                           current_username=session['username'])

@app.route('/api/messages/<int:other_user_id>')
@login_required
def get_messages(other_user_id):
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT m.id, m.sender_id, m.receiver_id, m.message, m.is_read,
                   m.created_at, u.username as sender_name
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE (m.sender_id = %s AND m.receiver_id = %s)
               OR (m.sender_id = %s AND m.receiver_id = %s)
            ORDER BY m.created_at ASC LIMIT 100
        """, (session['user_id'], other_user_id, other_user_id, session['user_id']))
        messages = cursor.fetchall()
        cursor.execute("""
            UPDATE messages SET is_read = TRUE
            WHERE sender_id = %s AND receiver_id = %s AND is_read = FALSE
        """, (other_user_id, session['user_id']))
        cursor.close()
        conn.close()
        result = []
        for msg in messages:
            result.append({
                'id': msg['id'],
                'sender_id': msg['sender_id'],
                'receiver_id': msg['receiver_id'],
                'message': msg['message'],
                'is_read': bool(msg['is_read']),
                'timestamp': msg['created_at'].strftime('%I:%M %p'),
                'date': msg['created_at'].strftime('%Y-%m-%d'),
            })
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/online')
@login_required
def get_online_users():
    return jsonify(list(online_users.keys()))

# ─── Socket.IO ─────────────────────────────────────────────────────────────────
@socketio.on('connect')
def on_connect():
    if 'user_id' in session:
        user_id = session['user_id']
        online_users[user_id] = request.sid
        join_room(f"user_{user_id}")
        emit('user_online', {'user_id': user_id}, broadcast=True)

@socketio.on('disconnect')
def on_disconnect():
    if 'user_id' in session:
        user_id = session['user_id']
        online_users.pop(user_id, None)
        leave_room(f"user_{user_id}")
        emit('user_offline', {'user_id': user_id}, broadcast=True)

@socketio.on('send_message')
def handle_send_message(data):
    if 'user_id' not in session:
        return
    sender_id = session['user_id']
    receiver_id = data.get('receiver_id')
    message_text = data.get('message', '').strip()
    if not receiver_id or not message_text:
        return
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO messages (sender_id, receiver_id, message) VALUES (%s, %s, %s)",
            (sender_id, receiver_id, message_text)
        )
        msg_id = cursor.lastrowid
        cursor.close()
        conn.close()
        now = datetime.now()
        payload = {
            'id': msg_id,
            'sender_id': sender_id,
            'receiver_id': receiver_id,
            'message': message_text,
            'timestamp': now.strftime('%I:%M %p'),
            'date': now.strftime('%Y-%m-%d'),
            'sender_name': session['username'],
        }
        emit('receive_message', payload, room=f"user_{receiver_id}")
        emit('message_sent', payload, room=f"user_{sender_id}")
    except Exception as e:
        emit('error', {'message': str(e)})

@socketio.on('typing')
def handle_typing(data):
    if 'user_id' not in session:
        return
    receiver_id = data.get('receiver_id')
    if receiver_id:
        emit('user_typing', {'sender_id': session['user_id'], 'username': session['username']}, room=f"user_{receiver_id}")

@socketio.on('stop_typing')
def handle_stop_typing(data):
    if 'user_id' not in session:
        return
    receiver_id = data.get('receiver_id')
    if receiver_id:
        emit('user_stop_typing', {'sender_id': session['user_id']}, room=f"user_{receiver_id}")

if __name__ == '__main__':
    init_db()
    print("🔮 Rimuru's ChatApp starting on http://localhost:5000")
    socketio.run(app, debug=True, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)
