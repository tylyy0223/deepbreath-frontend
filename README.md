# DeepBreath 深呼吸 · Deep Breath

> AI-powered psychological companion — chat, emotion tracking, breathing exercises, and personalized mental wellness.
>
> 一个 AI 驱动的心理健康陪伴平台：智能对话 · 情绪日记 · 呼吸练习 · 心理测评。



<div align="center">

## ⭐ **喜欢这个项目吗？请给我们一个 Star！** ⭐

[![Star on GitHub](https://img.shields.io/github/stars/tylyy0223/deepbreath-frontend?style=for-the-badge&logo=github&labelColor=black&color=f7df1e)](https://github.com/tylyy0223/deepbreath-frontend)

<sub>你的 Star 是对我们最大的鼓励，也能让更多人发现这个项目 🚀</sub>

</div>

---

## ✨ Features · 功能

### 💬 AI Chat · 智能对话
Four counseling modes — **Science** (psychoeducation), **Counseling** (supportive conversation), **Assessment** (structured evaluation), **Reading** (book-guided learning with 233 psychology e-books).

四种对话模式：**心理科普** / **心理树洞** / **心理评估** / **阅读模式**（233 本心理学电子书报号学书）。

### 🫁 Breathing · 呼吸练习
Animated breathing guidance with voice, session tracking, and personal statistics.

动画引导呼吸练习，语音陪伴，完成记录与统计。

### 📔 Emotion Diary · 情绪日记
5-level emoji mood tracking, body sensation tags, weather labels, and trend analysis.

五级 emoji 情绪记录，身体感受标注，天气标签，趋势面板。

### 📝 Scales · 心理测评
SDS / SAS / SCL-90 with scoring, interpretation, and 10-dimension radar charts.

SDS（抑郁）/ SAS（焦虑）/ SCL-90（症状自评），计分解读 + 十维度图。

### 📰 Articles · 科普文章
Curated psychoeducation articles with emotion-based personalized recommendations.

精选心理科普文章，按情绪状态智能推荐。

### 👥 Community · 心情社区
Share insights and moods. Anonymous posting. Chat-to-community one-click sharing.

发帖 / 点赞 / 回复 / 匿名 / AI 对话一键分享。

### 💎 Credits · 计费系统
Credit-based billing with free daily usage, transparent per-message cost display.

日常使用免费，扣费透明展示，月度赠送。

---

## 🛠 Tech Stack · 技术栈

| Layer 层 | Technology |
|----------|-----------|
| Frontend 前端 | React 19 + TypeScript + Vite 8 + Tailwind CSS 3 |
| State 状态管理 | Zustand 5 |
| Routing 路由 | React Router v7 |
| Backend 后端 | Python FastAPI + SQLAlchemy 2 (async) |
| Database 数据库 | PostgreSQL + Redis |
| AI | DeepSeek API (chat) + MiniMax (TTS) |
| Deploy 部署 | Nginx + Systemd + Capacitor (Android APK) |

---

## 📂 Repositories · 代码仓库

| Repo 仓库 | Description 说明 |
|-----------|-------------|
| [deepbreath-frontend](https://github.com/tylyy0223/deepbreath-frontend) | React SPA frontend 前端 |
| [deepbreath-backend](https://github.com/tylyy0223/deepbreath-backend) | FastAPI backend 后端 |

---

## 🚀 Quick Start · 快速开始

```bash
# Frontend 前端
cd deepbreath-frontend
npm install
npm run dev          # → http://localhost:5173/app/

# Backend 后端
cd deep-breath/backend
source venv/bin/activate
cp .env.example .env  # Configure API keys
uvicorn app.main:app --host 0.0.0.0 --port 8003
```

---

## 📱 Mobile App · 移动端

Android APK via Capacitor shell — loads the SPA from server. Auto-update on version bump.

Capacitor 联网壳，加载线上 SPA。新版本自动弹窗升级。签名密钥 `deepbreath.keystore` 请勿丢失。

---

## 📄 License

MIT
