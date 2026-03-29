# 💙 SlimeChat — Rimuru Tempest Edition

> *That Time I Got Reincarnated as a Chat App*

A **dynamic anime-themed** real-time chat app featuring Rimuru Tempest GIFs,
dark glassmorphism UI, animated particles, and GIF reactions.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Configure MySQL in app.py
DB_CONFIG = {
    'user': 'root',       # ← your MySQL user
    'password': '',       # ← your MySQL password
    ...
}

# 3. Run
python app.py
```

Visit → **http://localhost:5000**

---

## ✨ Features

| Feature | Details |
|---|---|
| 🔮 **Rimuru GIFs** | Animated GIFs on login, register, welcome screen, sidebar, chat header |
| 🎭 **GIF Reactions** | Send Rimuru reaction GIFs in chat with one click |
| 💙 **Dark Anime UI** | Deep space dark theme with slime-blue glow effects |
| ✨ **Particle BG** | Animated floating particles on auth pages |
| 💬 **Real-time Chat** | Socket.IO private messaging |
| ⚡ **Typing Indicators** | Animated dots when someone is typing |
| 🟢 **Online Status** | Live online/offline indicator |
| 📱 **Mobile Responsive** | Slide-in sidebar on mobile |
| 🔔 **Ping Sound** | Notification tone on new message |
| 📅 **Date Dividers** | Smart date grouping (Today, Yesterday) |
| 🔍 **User Search** | Filter guild members in sidebar |

---

## 📁 Project Structure

```
chatapp2/
├── app.py
├── requirements.txt
├── README.md
├── templates/
│   ├── login.html
│   ├── register.html
│   └── chat.html
└── static/
    ├── css/style.css
    └── js/
        ├── particles.js
        └── chat.js
```

---

## 🎭 GIF Reactions

Press the **🎭 button** in the input bar to open the GIF reaction panel.
Three Rimuru GIFs can be sent as reactions in the chat!
