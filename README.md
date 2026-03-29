💬 SlimeChat — Real-Time Chat App

SlimeChat is a modern real-time chat web application inspired by WhatsApp UI, built using Flask, Socket.IO, and MySQL with a stylish anime-themed interface.

🌟 Features
🔐 Authentication System
User registration & login
Username-based login (no email required)
Profile image upload
Secure password handling
💬 Real-Time Chat
Instant messaging using Socket.IO
Private one-to-one chat
Messages update instantly (no refresh)
🧾 Message Storage
Messages stored in MySQL
Includes:
Sender
Receiver
Message content
Timestamp
Loads previous chat history
🎨 Modern UI Design
WhatsApp-style layout
🌌 Dark space theme with glow effects
✨ Glassmorphism login/register UI
💫 Animated background particles
👤 User Interface
Sidebar with all users
Profile images shown
Chat header with username
Chat bubbles (left/right style)
🎭 GIF Reactions
Send GIFs inside chat
Reaction button in input box
Animated GIF bubbles in messages
⚡ Extra Features
Auto-scroll chat
Prevent empty messages
Responsive design (mobile-friendly)
🛠️ Technologies Used
Frontend
HTML
CSS (Glassmorphism + animations)
JavaScript
Backend
Python Flask
Flask-SocketIO
Database
MySQL
📁 Project Structure
SlimeChat/
│── app.py
│── templates/
│   ├── login.html
│   ├── register.html
│   ├── chat.html
│
│── static/
│   ├── css/
│   ├── js/
│   ├── uploads/     # Profile images
│   ├── gifs/        # Reaction GIFs
⚙️ Installation & Setup
1️⃣ Clone the repository
git clone https://github.com/your-username/slimechat.git
cd slimechat
2️⃣ Install dependencies
pip install flask flask-socketio mysql-connector-python
3️⃣ Setup MySQL Database

Create database:

CREATE DATABASE slimechat;

Tables:

users(id, username, password, profile_image)

messages(id, sender, receiver, message, timestamp)
4️⃣ Run the app
python app.py

Open in browser:

http://localhost:5000
📸 Screenshots


🚀 Future Improvements
🟢 Online / Offline status
✍️ Typing indicator
✔️ Seen / Delivered ticks
🔔 Notification sounds
👨‍💻 Author

Sri Ram

⭐ Support

If you like this project:
👉 Give it a star on GitHub ⭐
