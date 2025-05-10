# 📈 Coding Statistics

**Coding Statistics** is a Visual Studio Code extension that collects and sends your coding activity statistics to a custom API.  
Perfect for developers who want to track productivity, editor usage time, file creation, and more.

---

## ⚙️ Features

- 📄 Count of **lines written**
- ⌨️ Count of **characters typed**
- 🗃️ Count of **files created**
- ⏱️ Tracking of **total editor usage time**
- ☁️ **Automatic data submission** when VS Code is closed
- 📧 Storage of the **user's email** to link your statistics

---

## 🔧 Setup

For the first time using the extension in a new machine, it is necessary to passthrow an email verification.

---

## 🐞 Known Issues

- Email capture may fail if the Git config (`user.email`) is not set.

---

## 📦 Release Notes

### 0.0.1

- Initial release with support for:
  - Line and character tracking
  - File counter
  - Total coding time
  - Automatic submission to the API

### 0.0.2 – 0.0.3

- Improvements in how **characters and lines** are counted

### 1.0.2

- Display of statistics in the **VS Code status bar**

### 1.0.3

- Fixed a bug that caused inaccurate tracking when switching branches.

### 1.1.0

- Including an authentication for security based on an email auth.

---

## 📬 Feedback

Have suggestions, questions, or found a bug?  
Feel free to open an [issue](https://github.com/your-repo/issues) or submit a [pull request](https://github.com/your-repo/pulls)!

---