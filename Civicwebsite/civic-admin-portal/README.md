# 🏛️ Civic Admin Portal

A comprehensive civic reporting system with mobile app integration, real-time synchronization, and professional ticket management.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Backend Deployment
```bash
npx convex dev
```

## 📱 Features

### ✅ Complete Implementation
- **Professional Ticket System** with TKT-XXXXXX IDs
- **Real-Time Sync** between web and mobile
- **File Upload System** with secure storage
- **SMS Task Assignment** to departments
- **Close Issue Feature** for resolved tickets
- **Dark/Light Theme** support
- **Responsive Design** for all devices

### 🔧 Technical Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Convex (Real-time database)
- **File Storage**: Convex Storage with HTTP endpoints
- **Maps**: Google Maps integration

## 🌐 Live Backend
- **URL**: https://quick-anaconda-973.convex.cloud
- **Status**: ✅ Active and deployed

## 📊 Project Status
**COMPLETE & PRODUCTION READY** - All core features implemented and tested.

## 📁 File Structure
```
src/
├── App-enhanced.tsx          # Main application (ACTIVE)
├── App.tsx                   # Entry point
├── IssueDetailModal.tsx      # Issue detail component
├── main.tsx                  # React entry
├── index.css                 # Global styles
├── contexts/                 # React contexts
└── hooks/                    # Custom hooks

convex/
├── schema.ts                 # Database schema
├── issues.ts                 # Core functions
├── http.ts                   # File endpoints
└── test.ts                   # Testing functions
```

## 🔄 Workflow
1. **Mobile App** → Submit issue with files
2. **Web Portal** → Admin manages and assigns
3. **SMS Integration** → Department notifications
4. **Status Updates** → Real-time sync
5. **Issue Closure** → Remove from active queue

## 📞 Department Contacts
- Road Maintenance: +91-7249187996
- Electrical: +91-9881812186
- Water Supply: +91-7588953799
- Sanitation: +91-8830209016
- Traffic: +91-7558591267

---

**Last Updated**: December 2024 | **Version**: 1.0.0