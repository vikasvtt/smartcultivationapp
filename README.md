# 🌱 Smart Cultivation System (IoT + MERN)

<p align="center">
  <b>🚀 Real-Time Smart Agriculture Automation using ESP32, MERN & AWS IoT</b><br/>
  <i>Monitor • Automate • Optimize</i>
</p>

---

## 📌 Badges

![Status](https://img.shields.io/badge/Status-Active-success)
![IoT](https://img.shields.io/badge/Domain-IoT-blue)
![MERN](https://img.shields.io/badge/Stack-MERN-green)
![License](https://img.shields.io/badge/License-Educational-orange)
![Build](https://img.shields.io/badge/Build-Passing-brightgreen)

---

## 🚀 Overview

The **Smart Cultivation System** is an end-to-end IoT solution designed to automate agricultural environments using real-time data and rule-based decision making.

It connects:

- 🌡️ Sensors (Temperature, Humidity, Soil)
- ⚡ Actuators (Fan, Motor, Light)
- 📡 ESP32 (Edge Device)
- ☁️ AWS IoT (Cloud)
- 🌐 MERN Stack (Dashboard)

---

## 🎯 Key Features

### 🧠 Intelligent Automation Engine

- Multi-condition rules
- AND / OR logic support
- Dynamic configuration from backend

### 📊 Real-Time Monitoring

- Temperature 🌡️
- Humidity 💧
- Soil Moisture 🌱
- Soil Status (DRY / WET)

### ⚙️ Remote Control

- Fan control
- Irrigation motor
- Lighting system

### ☁️ Cloud Integration

- AWS IoT Core (MQTT)
- Real-time telemetry updates

### 🌐 Dashboard

- Live sensor data
- Rule configuration UI
- Device status tracking

---

## 🏗️ System Architecture

```
        ┌───────────────┐
        │   Sensors     │
        │ (Temp/Hum/Soil)
        └──────┬────────┘
               │
        ┌──────▼────────┐
        │    ESP32      │
        │ (Logic Engine)│
        └──────┬────────┘
               │
     ┌─────────▼──────────┐
     │   Backend API      │
     │ (Node + Express)   │
     └─────────┬──────────┘
               │
        ┌──────▼───────┐
        │   MongoDB    │
        └──────┬───────┘
               │
        ┌──────▼────────┐
        │   AWS IoT     │
        └──────┬────────┘
               │
        ┌──────▼────────┐
        │ React Frontend│
        └───────────────┘
```

---

## 🧩 Tech Stack

### 🔹 Hardware

- ESP32
- DHT22 Sensor
- Soil Moisture Sensor
- Relay Module

### 🔹 Software

- **Frontend:** React.js + Material UI
- **Backend:** Node.js + Express.js
- **Database:** MongoDB
- **Cloud:** AWS IoT Core (MQTT)

---

## ⚙️ How It Works

1. ESP32 reads sensor values
2. Fetches automation rules from backend
3. Evaluates conditions (AND / OR logic)
4. Controls relays accordingly
5. Sends telemetry to AWS IoT
6. Dashboard displays live data

---

## 📡 Example Automation Rule

```json
{
  "motor": {
    "enabled": true,
    "logic": "AND",
    "conditions": [
      { "parameter": "soil", "operator": "<", "value": 1450 },
      { "parameter": "temperature", "operator": "<=", "value": 25 }
    ]
  }
}
```

---

## 📸 Screenshots (Add Yours)

> Add screenshots in a `/screenshots` folder and link them here

```
/screenshots/dashboard.png
/screenshots/rules.png
/screenshots/device-status.png
```

---

## 🛠️ Setup Guide

### 1️⃣ Clone Repository

```bash
git clone <your-repo-url>
cd project-folder
```

---

### 2️⃣ Frontend Setup

```bash
npm install
npm start
```

👉 Runs on: http://localhost:3000

---

### 3️⃣ Backend Setup

```bash
cd backend
npm install
npm run dev
```

---

### 4️⃣ ESP32 Setup

- Upload Arduino code
- Configure:

  - WiFi credentials
  - Backend API URL
  - AWS certificates

---

## 🔐 Environment Variables

Create `.env` file:

```
MONGO_URI=your_mongodb_uri
PORT=5000
```

---

## ⚠️ Important Notes

- Relay module uses **ACTIVE LOW logic**
- Ensure **common GND**
- Use external power for relays (JD-VCC)
- Backend JSON must match ESP structure

---

## 🚀 Future Enhancements

- 🤖 AI-based irrigation system
- 📱 Mobile application
- 📊 Advanced analytics dashboard
- 🔔 Alerts & notifications
- ⏱️ Time-based scheduling

---

## 👨‍💻 Contributors

- Darshan Janganure
- Pooja Madiwalar

---

## 📜 License

This project is for **academic and educational purposes only**.

---

## ⭐ Show Your Support

If you like this project:

👉 Star ⭐ the repo
👉 Fork 🍴 it
👉 Contribute 💡

---

## 💡 Final Thought

This project is a **complete real-world IoT system** combining:

👉 Embedded Systems
👉 Cloud Computing
👉 Web Development

Perfect for:

- 🚀 Hackathons
- 💼 Placements
- 📂 Portfolio

---
