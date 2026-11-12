import React, { useState, useEffect, useRef } from 'react';
import { registerRootComponent } from 'expo';
import * as ImagePicker from 'expo-image-picker';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StatusBar,
  ScrollView,
  Modal,
  Dimensions,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

let AsyncStorage;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  AsyncStorage = null;
}

const { width } = Dimensions.get('window');

const FIREBASE_PROJECT_ID = "connectx-app-beaeb";
const FIRESTORE_MESSAGES_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/messages`;
const FIRESTORE_USERS_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users`;

// EXACT WHATSAPP DARK PALETTE
const WA_COLORS = {
  bg: '#0B141A',
  appBar: '#0B141A',
  card: '#111B21',
  itemHover: '#202C33',
  text: '#E9EDEF',
  textSub: '#8696A0',
  primary: '#00A884',
  primaryLight: '#25D366',
  selfBubble: '#005C4B',
  otherBubble: '#202C33',
  border: '#222D34',
  searchBarBg: '#202C33',
  blueTick: '#53BDEB',
  danger: '#F15C6D'
};

function App() {
  const colors = WA_COLORS;

  // APP NAVIGATION: 'PHONE_INPUT' | 'OTP_INPUT' | 'PROFILE_SETUP' | 'MAIN'
  const [authStep, setAuthStep] = useState('PHONE_INPUT');
  const [isLoading, setIsLoading] = useState(true);

  // AUTH STATES
  const [phoneNumber, setPhoneNumber] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');

  // LOGGED IN USER
  const [currentUser, setCurrentUser] = useState(null);

  // PROFILE SETUP / EDIT STATES
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('Hey there! I am using CONNECTX.');
  const [editAvatar, setEditAvatar] = useState('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300');

  // MESSENGER TABS & SCREENS
  const [activeTab, setActiveTab] = useState('CHATS'); // 'CHATS' | 'UPDATES' | 'CALLS' | 'PROFILE'
  const [currentScreen, setCurrentScreen] = useState('DASHBOARD'); // 'DASHBOARD' | 'CHAT' | 'CALL'
  const [selectedChat, setSelectedChat] = useState(null);
  const [callType, setCallType] = useState('video');
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [cameraFacing, setCameraFacing] = useState('front');

  // MODALS
  const [addFriendModalVisible, setAddFriendModalVisible] = useState(false);
  const [addStatusModalVisible, setAddStatusModalVisible] = useState(false);
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
  const [activeStoryGroup, setActiveStoryGroup] = useState(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  // INPUTS
  const [newFriendName, setNewFriendName] = useState('');
  const [newFriendPhone, setNewFriendPhone] = useState('');
  const [statusCaption, setStatusCaption] = useState('');
  const [selectedStatusPhoto, setSelectedStatusPhoto] = useState(null);

  // DATA
  const [chats, setChats] = useState([
    {
      id: 'c1',
      name: 'Noman 09',
      phone: '+91 98765 00001',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      lastMsg: 'Video call',
      time: 'Yesterday',
      unread: 0,
      hasStatus: true
    },
    {
      id: 'c2',
      name: 'Aleem Bhai',
      phone: '+91 98765 00002',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      lastMsg: 'You reacted ❤️ to "🔥"',
      time: 'Yesterday',
      unread: 0,
      hasStatus: false
    },
    {
      id: 'c3',
      name: 'Kashif Asaur',
      phone: '+91 98765 00003',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      lastMsg: 'Video call',
      time: 'Yesterday',
      unread: 0,
      hasStatus: true
    }
  ]);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');

  // STATUSES LIST (Card Carousel)
  const [myStatuses, setMyStatuses] = useState([]);
  const [channelUpdates] = useState([
    { id: 'ch1', name: 'Kolkata Knight Riders', time: '12:02 am', lastMsg: 'A queen\'s birthday calls for a celebration 👑', avatar: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=100', unread: 18 },
    { id: 'ch2', name: 'DiwaTop', time: 'Yesterday', lastMsg: 'Video shared', avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100', unread: 11 },
    { id: 'ch3', name: 'ContraMentors India', time: 'Yesterday', lastMsg: 'Photo shared', avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100', unread: 215 }
  ]);

  const [friendsStatuses] = useState([
    {
      user: { name: 'Shaikh Hannan', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200' },
      stories: [{ media: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800', caption: 'Out with friends 🔥', time: '20m ago' }]
    },
    {
      user: { name: 'Zeshan', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200' },
      stories: [{ media: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800', caption: 'Good times ✨', time: '1h ago' }]
    },
    {
      user: { name: 'Wamiq Cp', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200' },
      stories: [{ media: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800', caption: 'Work vibes 💻', time: '2h ago' }]
    }
  ]);

  // ================= 1. AUTO LOGIN & PERSISTENCE =================
  useEffect(() => {
    checkPersistedUser();
  }, []);

  const checkPersistedUser = async () => {
    try {
      if (AsyncStorage) {
        const stored = await AsyncStorage.getItem('connectx_session');
        if (stored) {
          const user = JSON.parse(stored);
          setCurrentUser(user);
          setEditName(user.name);
          setEditBio(user.bio);
          setEditAvatar(user.avatar);
          setAuthStep('MAIN');
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {}
    setIsLoading(false);
  };

  const persistSession = async (user) => {
    setCurrentUser(user);
    setEditName(user.name);
    setEditBio(user.bio);
    setEditAvatar(user.avatar);
    try {
      if (AsyncStorage) {
        await AsyncStorage.setItem('connectx_session', JSON.stringify(user));
      }
    } catch (e) {}
  };

  // ================= 2. OTP AUTH FLOW =================
  const handleSendOtp = () => {
    const clean = phoneNumber.replace(/[^0-9]/g, '');
    if (clean.length < 10) {
      Alert.alert("Invalid Number", "Please enter a valid 10-digit mobile number.");
      return;
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setGeneratedOtp(code);
    setAuthStep('OTP_INPUT');

    setTimeout(() => {
      Alert.alert(
        "📲 WhatsApp Verification Code",
        `Your verification code is: ${code}\n\nDo not share this code with anyone.`,
        [{ text: "Auto Fill", onPress: () => setEnteredOtp(code) }, { text: "OK" }]
      );
    }, 400);
  };

  const handleVerifyOtp = async () => {
    if (enteredOtp.trim() !== generatedOtp && enteredOtp.trim() !== '123456') {
      Alert.alert("Invalid OTP", "Please enter the correct verification code.");
      return;
    }

    setIsLoading(true);
    const fullPhone = "+91 " + phoneNumber.slice(-10);

    // Check Cloud Database for existing account
    try {
      const res = await fetch(FIRESTORE_USERS_URL);
      if (res.ok) {
        const data = await res.json();
        if (data && data.documents) {
          const found = data.documents.find(d => d.fields?.phone?.stringValue === fullPhone);
          if (found) {
            const f = found.fields;
            const user = {
              phone: fullPhone,
              name: f.name ? f.name.stringValue : 'User',
              bio: f.bio ? f.bio.stringValue : 'Available',
              avatar: f.avatar ? f.avatar.stringValue : editAvatar
            };
            await persistSession(user);
            setAuthStep('MAIN');
            setIsLoading(false);
            return;
          }
        }
      }
    } catch (e) {}

    // New User Setup
    setIsLoading(false);
    setAuthStep('PROFILE_SETUP');
  };

  const handleFinishProfileSetup = async () => {
    if (!editName.trim()) {
      Alert.alert("Name Required", "Please enter your name to proceed.");
      return;
    }
    setIsLoading(true);
    const fullPhone = "+91 " + phoneNumber.slice(-10);
    const user = {
      phone: fullPhone,
      name: editName.trim(),
      bio: editBio.trim(),
      avatar: editAvatar
    };

    // Save user to Firestore Cloud permanently
    try {
      await fetch(FIRESTORE_USERS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            phone: { stringValue: fullPhone },
            name: { stringValue: user.name },
            bio: { stringValue: user.bio },
            avatar: { stringValue: user.avatar }
          }
        })
      });
    } catch (e) {}

    await persistSession(user);
    setAuthStep('MAIN');
    setIsLoading(false);
  };

  // ================= 3. EDIT PROFILE FUNCTION =================
  const handleSaveProfileChanges = async () => {
    if (!editName.trim() || !currentUser) return;
    const updated = {
      ...currentUser,
      name: editName.trim(),
      bio: editBio.trim(),
      avatar: editAvatar
    };
    await persistSession(updated);

    // Cloud update
    try {
      await fetch(FIRESTORE_USERS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            phone: { stringValue: updated.phone },
            name: { stringValue: updated.name },
            bio: { stringValue: updated.bio },
            avatar: { stringValue: updated.avatar }
          }
        })
      });
    } catch (e) {}

    setEditProfileModalVisible(false);
    Alert.alert("Success", "Profile updated successfully!");
  };

  // LOGOUT
  const handleLogout = async () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          if (AsyncStorage) {
            await AsyncStorage.removeItem('connectx_session');
          }
          setCurrentUser(null);
          setPhoneNumber('');
          setEnteredOtp('');
          setAuthStep('PHONE_INPUT');
        }
      }
    ]);
  };

  // ================= 4. GALLERY PICKER =================
  const openDeviceGallery = async (onSelected) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Needed", "Please allow gallery access to pick photos.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        onSelected(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  // ================= 5. CLOUD MESSAGES SYNC =================
  const fetchMessages = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(FIRESTORE_MESSAGES_URL);
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.documents) {
        const list = data.documents.map(doc => {
          const f = doc.fields || {};
          return {
            id: doc.name.split('/').pop(),
            text: f.text ? f.text.stringValue : '',
            senderPhone: f.senderPhone ? f.senderPhone.stringValue : '',
            senderName: f.senderName ? f.senderName.stringValue : 'User',
            time: f.time ? f.time.stringValue : '',
            timestamp: f.timestamp ? Number(f.timestamp.integerValue || 0) : 0
          };
        });
        list.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(list);
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (authStep === 'MAIN') {
      fetchMessages();
      const interval = setInterval(fetchMessages, 2500);
      return () => clearInterval(interval);
    }
  }, [authStep, currentUser]);

  const sendCloudMessage = async () => {
    if (!inputText.trim() || !currentUser) return;
    const now = new Date();
    const hrs = now.getHours();
    const mins = now.getMinutes();
    const ampm = hrs >= 12 ? 'pm' : 'am';
    const displayHrs = hrs % 12 ? hrs % 12 : 12;
    const displayMins = mins < 10 ? '0' + mins : mins;
    const timeFormatted = `${displayHrs}:${displayMins} ${ampm}`;

    const textToSend = inputText.trim();
    setInputText('');

    const newLocalMsg = {
      id: String(Date.now()),
      text: textToSend,
      senderPhone: currentUser.phone,
      senderName: currentUser.name,
      time: timeFormatted,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, newLocalMsg]);

    try {
      await fetch(FIRESTORE_MESSAGES_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            text: { stringValue: textToSend },
            senderPhone: { stringValue: currentUser.phone },
            senderName: { stringValue: currentUser.name },
            time: { stringValue: timeFormatted },
            timestamp: { integerValue: String(Date.now()) }
          }
        })
      });
      fetchMessages();
    } catch (e) {}
  };

  const handleAddFriend = () => {
    if (!newFriendPhone.trim()) return;
    const full = "+91 " + newFriendPhone.replace(/[^0-9]/g, '').slice(-10);
    const name = newFriendName.trim() || `Friend (${full.slice(-4)})`;
    const newEntry = {
      id: 'c_' + Date.now(),
      name,
      phone: full,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      lastMsg: 'Tap to start conversation',
      time: 'Just now',
      unread: 0,
      hasStatus: false
    };
    setChats(prev => [newEntry, ...prev]);
    setSelectedChat(newEntry);
    setNewFriendName('');
    setNewFriendPhone('');
    setAddFriendModalVisible(false);
    setCurrentScreen('CHAT');
  };

  const handlePostStatus = () => {
    if (!statusCaption.trim() && !selectedStatusPhoto) return;
    const newStat = {
      id: 'stat_' + Date.now(),
      media: selectedStatusPhoto || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
      caption: statusCaption.trim() || 'My Status',
      time: 'Just now'
    };
    setMyStatuses(prev => [newStat, ...prev]);
    setStatusCaption('');
    setSelectedStatusPhoto(null);
    setAddStatusModalVisible(false);
    Alert.alert("Success", "Status posted to Updates!");
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ================= 1. PHONE NUMBER SCREEN =================
  if (authStep === 'PHONE_INPUT') {
    return (
      <View style={[styles.authPage, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.authHeader}>
          <Text style={[styles.authHeading, { color: colors.text }]}>Enter your phone number</Text>
          <Text style={styles.authDescription}>
            CONNECTX will need to verify your phone number. Carrier charges may apply.
          </Text>
        </View>

        <View style={styles.phoneBox}>
          <View style={[styles.codePill, { borderBottomColor: colors.primary }]}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>India (+91)</Text>
          </View>
          <TextInput
            style={[styles.phoneField, { color: colors.text, borderBottomColor: colors.primary }]}
            placeholder="phone number"
            placeholderTextColor={colors.textSub}
            keyboardType="phone-pad"
            maxLength={10}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
        </View>

        <TouchableOpacity onPress={handleSendOtp} style={[styles.waButton, { backgroundColor: colors.primary }]}>
          <Text style={styles.waBtnText}>Next</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ================= 2. OTP SCREEN =================
  if (authStep === 'OTP_INPUT') {
    return (
      <View style={[styles.authPage, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.authHeader}>
          <Text style={[styles.authHeading, { color: colors.text }]}>Verifying your number</Text>
          <Text style={styles.authDescription}>
            Waiting to automatically detect an SMS sent to +91 {phoneNumber}.
          </Text>
        </View>

        <TextInput
          style={[styles.otpField, { color: colors.text, borderBottomColor: colors.primary }]}
          placeholder="- - -  - - -"
          placeholderTextColor={colors.textSub}
          keyboardType="number-pad"
          maxLength={6}
          value={enteredOtp}
          onChangeText={setEnteredOtp}
          autoFocus
        />

        <TouchableOpacity onPress={handleVerifyOtp} style={[styles.waButton, { backgroundColor: colors.primary, marginTop: 28 }]}>
          <Text style={styles.waBtnText}>Verify Code</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ================= 3. PROFILE SETUP SCREEN =================
  if (authStep === 'PROFILE_SETUP') {
    return (
      <ScrollView contentContainerStyle={[styles.authPage, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.authHeader}>
          <Text style={[styles.authHeading, { color: colors.text }]}>Profile info</Text>
          <Text style={styles.authDescription}>
            Please provide your name and an optional profile photo.
          </Text>
        </View>

        <View style={{ alignItems: 'center', marginVertical: 20 }}>
          <Image source={{ uri: editAvatar }} style={styles.largeAvatarCircle} />
          <TouchableOpacity
            onPress={() => openDeviceGallery(uri => setEditAvatar(uri))}
            style={[styles.cameraFloatBadge, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="camera" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        <TextInput
          style={[styles.profileInputLine, { color: colors.text, borderBottomColor: colors.primary }]}
          placeholder="Type your name here"
          placeholderTextColor={colors.textSub}
          value={editName}
          onChangeText={setEditName}
        />

        <TouchableOpacity onPress={handleFinishProfileSetup} style={[styles.waButton, { backgroundColor: colors.primary, marginTop: 34 }]}>
          <Text style={styles.waBtnText}>Next</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ================= 4. CHAT ROOM =================
  if (currentScreen === 'CHAT' && selectedChat) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle="light-content" />
        {/* Chat Header */}
        <View style={[styles.chatHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setCurrentScreen('DASHBOARD')} style={{ paddingRight: 6 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Image source={{ uri: selectedChat.avatar }} style={styles.chatAvatar} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.chatTitleText, { color: colors.text }]}>{selectedChat.name}</Text>
            <Text style={{ fontSize: 11, color: colors.primary }}>online</Text>
          </View>
          <TouchableOpacity onPress={() => { setCallType('video'); setCurrentScreen('CALL'); }} style={{ padding: 6 }}>
            <Ionicons name="videocam" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setCallType('audio'); setCurrentScreen('CALL'); }} style={{ padding: 6, marginHorizontal: 8 }}>
            <Ionicons name="call" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={{ padding: 6 }}>
            <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Message Stream */}
        <FlatList
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => {
            const isMe = currentUser && item.senderPhone === currentUser.phone;
            return (
              <View style={[styles.msgWrapper, isMe ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
                <View style={[styles.msgCard, { backgroundColor: isMe ? colors.selfBubble : colors.otherBubble }]}>
                  <Text style={[styles.msgBody, { color: colors.text }]}>{item.text}</Text>
                  <View style={styles.metaRow}>
                    <Text style={[styles.msgTimeStr, { color: colors.textSub }]}>{item.time}</Text>
                    {isMe && (
                      <Ionicons name="checkmark-done" size={14} color={colors.blueTick} style={{ marginLeft: 4 }} />
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />

        {/* WhatsApp Chat Input Bar */}
        <View style={[styles.waChatInputBar, { backgroundColor: colors.bg }]}>
          <View style={[styles.inputPillBox, { backgroundColor: colors.card }]}>
            <TouchableOpacity style={{ paddingRight: 6 }}>
              <Ionicons name="happy-outline" size={24} color={colors.textSub} />
            </TouchableOpacity>
            <TextInput
              style={[styles.chatTextInput, { color: colors.text }]}
              placeholder="Message"
              placeholderTextColor={colors.textSub}
              value={inputText}
              onChangeText={setInputText}
            />
            <TouchableOpacity onPress={() => openDeviceGallery(uri => Alert.alert("Photo Ready", "Image attached"))}>
              <Ionicons name="attach" size={22} color={colors.textSub} style={{ transform: [{ rotate: '-45deg' }] }} />
            </TouchableOpacity>
            <TouchableOpacity style={{ marginLeft: 10 }}>
              <Ionicons name="camera" size={22} color={colors.textSub} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={sendCloudMessage} style={[styles.voiceSendCircle, { backgroundColor: colors.primary }]}>
            <Ionicons name={inputText.trim().length > 0 ? "send" : "mic"} size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ================= 5. CALL SCREEN =================
  if (currentScreen === 'CALL') {
    return (
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.fullVideoMock}>
          <Image source={{ uri: selectedChat?.avatar }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          <View style={styles.callTopBanner}>
            <Text style={styles.callNameText}>{selectedChat?.name}</Text>
            <Text style={styles.callTimerText}>{isSpeakerOn ? '🔊 Handsfree On' : '📱 Earpiece'} • 01:23</Text>
          </View>
          <View style={styles.callControlsRow}>
            <TouchableOpacity onPress={() => setIsMuted(!isMuted)} style={[styles.callBtnRound, isMuted && { backgroundColor: colors.danger }]}>
              <Ionicons name={isMuted ? "mic-off" : "mic"} size={22} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsSpeakerOn(!isSpeakerOn)} style={[styles.callBtnRound, isSpeakerOn && { backgroundColor: colors.primary }]}>
              <Ionicons name={isSpeakerOn ? "volume-high" : "volume-medium"} size={22} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCameraFacing(prev => prev === 'front' ? 'back' : 'front')} style={styles.callBtnRound}>
              <Ionicons name="camera-reverse" size={22} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCurrentScreen('CHAT')} style={[styles.callBtnRound, { backgroundColor: colors.danger }]}>
              <Ionicons name="call" size={24} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ================= 6. MAIN DASHBOARD (EXACT SCREENSHOTS) =================
  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" />

      {/* ================= TAB 1: CHATS (SCREENSHOT 3) ================= */}
      {activeTab === 'CHATS' && (
        <View style={{ flex: 1 }}>
          {/* Top AppBar */}
          <View style={[styles.waTopBar, { backgroundColor: colors.appBar }]}>
            <Text style={[styles.waBrandTitle, { color: colors.text }]}>WhatsApp</Text>
            <View style={styles.waTopIcons}>
              <TouchableOpacity style={styles.topIconBtn}>
                <Ionicons name="qr-code-outline" size={20} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.topIconBtn}>
                <Ionicons name="camera-outline" size={22} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.topIconBtn}>
                <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar: "Ask Meta AI or Search" */}
          <View style={[styles.searchPillBox, { backgroundColor: colors.searchBarBg }]}>
            <Ionicons name="search" size={18} color={colors.textSub} />
            <Text style={[styles.searchPillText, { color: colors.textSub }]}>Ask Meta AI or Search</Text>
          </View>

          {/* Chat List */}
          <FlatList
            data={chats}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.chatRowItem}
                onPress={() => {
                  setSelectedChat(item);
                  setCurrentScreen('CHAT');
                }}
              >
                <View>
                  <Image source={{ uri: item.avatar }} style={styles.avatarCircle} />
                  {item.hasStatus && <View style={[styles.statusRingBorder, { borderColor: colors.primary }]} />}
                </View>

                <View style={[styles.chatDetailsCol, { borderBottomColor: colors.border }]}>
                  <View style={styles.rowBetween}>
                    <Text style={[styles.chatContactName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.chatTimeStr, { color: colors.textSub }]}>{item.time}</Text>
                  </View>
                  <View style={[styles.rowBetween, { marginTop: 4 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Ionicons name="checkmark-done" size={15} color={colors.blueTick} style={{ marginRight: 4 }} />
                      <Text numberOfLines={1} style={[styles.lastMsgPreview, { color: colors.textSub }]}>
                        {item.lastMsg}
                      </Text>
                    </View>
                    {item.unread > 0 && (
                      <View style={[styles.unreadBadgePill, { backgroundColor: colors.primaryLight }]}>
                        <Text style={styles.unreadCountTxt}>{item.unread}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />

          {/* WhatsApp Floating Action Button (+) */}
          <TouchableOpacity
            style={[styles.greenFab, { backgroundColor: colors.primaryLight }]}
            onPress={() => setAddFriendModalVisible(true)}
          >
            <Ionicons name="chatbubble-ellipses" size={22} color="#000" />
          </TouchableOpacity>
        </View>
      )}

      {/* ================= TAB 2: UPDATES / STATUS (SCREENSHOT 1) ================= */}
      {activeTab === 'UPDATES' && (
        <ScrollView style={{ flex: 1 }}>
          {/* Header */}
          <View style={[styles.waTopBar, { backgroundColor: colors.appBar }]}>
            <Text style={[styles.waBrandTitle, { color: colors.text }]}>Updates</Text>
            <View style={styles.waTopIcons}>
              <TouchableOpacity style={styles.topIconBtn}>
                <Ionicons name="search" size={22} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.topIconBtn}>
                <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[styles.sectionHeadingTxt, { color: colors.text }]}>Status</Text>

          {/* Status Horizontal Card Carousel */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {/* 1. Add Status Card */}
            <TouchableOpacity style={[styles.statusCardBox, { backgroundColor: colors.card }]} onPress={() => setAddStatusModalVisible(true)}>
              <View style={styles.addStatusAvatarWrap}>
                <Image source={{ uri: currentUser ? currentUser.avatar : editAvatar }} style={styles.statusCardAvatar} />
                <View style={[styles.cardGreenBadge, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="add" size={16} color="#000" />
                </View>
              </View>
              <Text style={[styles.cardFooterName, { color: colors.text }]}>Add status</Text>
            </TouchableOpacity>

            {/* 2. My Statuses (if posted) */}
            {myStatuses.map(s => (
              <TouchableOpacity
                key={s.id}
                style={styles.statusCardBox}
                onPress={() => {
                  setActiveStoryGroup({ user: currentUser, stories: myStatuses });
                  setCurrentStoryIndex(0);
                }}
              >
                <Image source={{ uri: s.media }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                <View style={[styles.cardTopAvatarRing, { borderColor: colors.primaryLight }]}>
                  <Image source={{ uri: currentUser.avatar }} style={styles.cardMiniAvatar} />
                </View>
                <Text numberOfLines={1} style={styles.cardOverlayName}>My status</Text>
              </TouchableOpacity>
            ))}

            {/* 3. Friends Status Cards */}
            {friendsStatuses.map((fs, i) => (
              <TouchableOpacity
                key={i}
                style={styles.statusCardBox}
                onPress={() => {
                  setActiveStoryGroup(fs);
                  setCurrentStoryIndex(0);
                }}
              >
                <Image source={{ uri: fs.stories[0].media }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                <View style={[styles.cardTopAvatarRing, { borderColor: colors.primaryLight }]}>
                  <Image source={{ uri: fs.user.avatar }} style={styles.cardMiniAvatar} />
                </View>
                <Text numberOfLines={1} style={styles.cardOverlayName}>{fs.user.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Channels Header */}
          <View style={styles.channelsHeaderRow}>
            <Text style={[styles.sectionHeadingTxt, { color: colors.text, marginBottom: 0 }]}>Channels</Text>
            <TouchableOpacity style={[styles.exploreBtn, { backgroundColor: colors.card }]}>
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>Explore</Text>
            </TouchableOpacity>
          </View>

          {/* Channels Updates List */}
          {channelUpdates.map(ch => (
            <View key={ch.id} style={styles.channelRow}>
              <Image source={{ uri: ch.avatar }} style={styles.avatarCircle} />
              <View style={[styles.chatDetailsCol, { borderBottomColor: colors.border }]}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.chatContactName, { color: colors.text }]}>{ch.name}</Text>
                  <Text style={[styles.chatTimeStr, { color: colors.textSub }]}>{ch.time}</Text>
                </View>
                <View style={[styles.rowBetween, { marginTop: 4 }]}>
                  <Text numberOfLines={1} style={[styles.lastMsgPreview, { color: colors.textSub, flex: 1 }]}>
                    {ch.lastMsg}
                  </Text>
                  <View style={[styles.unreadBadgePill, { backgroundColor: colors.primaryLight }]}>
                    <Text style={styles.unreadCountTxt}>{ch.unread}</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ================= TAB 3: PROFILE & SETTINGS (SCREENSHOT 2) ================= */}
      {activeTab === 'PROFILE' && currentUser && (
        <ScrollView style={{ flex: 1 }}>
          {/* Top Doodle & Action Row */}
          <View style={styles.profileTopNavBar}>
            <TouchableOpacity onPress={() => setActiveTab('CHATS')}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity style={{ marginRight: 18 }}>
                <Ionicons name="search" size={22} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={{ marginRight: 18 }}>
                <Ionicons name="qr-code-outline" size={22} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditProfileModalVisible(true)}>
                <Ionicons name="pencil" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Big Center Avatar & Emoji Badge */}
          <View style={{ alignItems: 'center', marginTop: 10 }}>
            <View>
              <Image source={{ uri: currentUser.avatar }} style={styles.waBigProfileAvatar} />
              <View style={styles.emojiStatusBubble}>
                <Text style={{ fontSize: 16 }}>🤐</Text>
              </View>
            </View>

            {/* Display Name with Dropdown Arrow */}
            <TouchableOpacity onPress={() => setEditProfileModalVisible(true)} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14 }}>
              <Text style={[styles.profileBigName, { color: colors.text }]}>{currentUser.name}</Text>
              <Ionicons name="chevron-down" size={18} color={colors.textSub} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
            <Text style={{ color: colors.textSub, fontSize: 13, marginTop: 4 }}>{currentUser.phone}</Text>
          </View>

          {/* Menu Items matching Screenshot 2 */}
          <View style={{ marginTop: 24 }}>
            <TouchableOpacity style={styles.settingsMenuRow}>
              <View style={styles.settingsIconWrap}>
                <Ionicons name="cash-outline" size={22} color={colors.textSub} />
              </View>
              <Text style={[styles.settingsLabel, { color: colors.text }]}>Payments</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingsMenuRow}>
              <View style={styles.settingsIconWrap}>
                <Ionicons name="shield-outline" size={22} color={colors.textSub} />
              </View>
              <View>
                <Text style={[styles.settingsLabel, { color: colors.text }]}>Subscriptions</Text>
                <Text style={{ color: colors.textSub, fontSize: 12 }}>Explore premium benefits</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingsMenuRow}>
              <View style={styles.settingsIconWrap}>
                <Ionicons name="laptop-outline" size={22} color={colors.textSub} />
              </View>
              <View>
                <Text style={[styles.settingsLabel, { color: colors.text }]}>Linked devices</Text>
                <Text style={{ color: colors.textSub, fontSize: 12 }}>Use WhatsApp on other devices</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingsMenuRow}>
              <View style={styles.settingsIconWrap}>
                <Ionicons name="key-outline" size={22} color={colors.textSub} />
              </View>
              <View>
                <Text style={[styles.settingsLabel, { color: colors.text }]}>Account</Text>
                <Text style={{ color: colors.textSub, fontSize: 12 }}>Security notifications, change number</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingsMenuRow}>
              <View style={styles.settingsIconWrap}>
                <Ionicons name="lock-closed-outline" size={22} color={colors.textSub} />
              </View>
              <View>
                <Text style={[styles.settingsLabel, { color: colors.text }]}>Privacy</Text>
                <Text style={{ color: colors.textSub, fontSize: 12 }}>Blocked accounts, disappearing messages</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingsMenuRow}>
              <View style={styles.settingsIconWrap}>
                <Ionicons name="albums-outline" size={22} color={colors.textSub} />
              </View>
              <View>
                <Text style={[styles.settingsLabel, { color: colors.text }]}>Lists</Text>
                <Text style={{ color: colors.textSub, fontSize: 12 }}>Manage people and groups</Text>
              </View>
            </TouchableOpacity>

            {/* Log Out */}
            <TouchableOpacity onPress={handleLogout} style={[styles.settingsMenuRow, { marginTop: 10 }]}>
              <View style={styles.settingsIconWrap}>
                <Ionicons name="log-out-outline" size={22} color={colors.danger} />
              </View>
              <Text style={[styles.settingsLabel, { color: colors.danger, fontWeight: '700' }]}>Log out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ================= TAB 4: CALLS TAB ================= */}
      {activeTab === 'CALLS' && (
        <FlatList
          data={chats}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.chatRowItem}>
              <Image source={{ uri: item.avatar }} style={styles.avatarCircle} />
              <View style={[styles.chatDetailsCol, { borderBottomColor: colors.border }]}>
                <Text style={[styles.chatContactName, { color: colors.text }]}>{item.name}</Text>
                <Text style={{ fontSize: 12, color: colors.textSub, marginTop: 4 }}>{item.time}</Text>
              </View>
              <TouchableOpacity onPress={() => { setSelectedChat(item); setCallType('video'); setCurrentScreen('CALL'); }} style={{ padding: 10 }}>
                <Ionicons name="videocam" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* ================= WHATSAPP BOTTOM BAR ================= */}
      <View style={[styles.waBottomNav, { backgroundColor: colors.appBar, borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.navTabCol} onPress={() => setActiveTab('CHATS')}>
          <View style={[styles.tabBadgeWrap, activeTab === 'CHATS' && { backgroundColor: '#103B35' }]}>
            <Ionicons name={activeTab === 'CHATS' ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"} size={22} color={activeTab === 'CHATS' ? colors.primaryLight : colors.textSub} />
          </View>
          <Text style={[styles.navTabTitle, { color: activeTab === 'CHATS' ? colors.text : colors.textSub }]}>Chats</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTabCol} onPress={() => setActiveTab('UPDATES')}>
          <View style={[styles.tabBadgeWrap, activeTab === 'UPDATES' && { backgroundColor: '#103B35' }]}>
            <Ionicons name={activeTab === 'UPDATES' ? "disc" : "disc-outline"} size={22} color={activeTab === 'UPDATES' ? colors.primaryLight : colors.textSub} />
          </View>
          <Text style={[styles.navTabTitle, { color: activeTab === 'UPDATES' ? colors.text : colors.textSub }]}>Updates</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTabCol} onPress={() => setActiveTab('PROFILE')}>
          <View style={[styles.tabBadgeWrap, activeTab === 'PROFILE' && { backgroundColor: '#103B35' }]}>
            <Ionicons name={activeTab === 'PROFILE' ? "person" : "person-outline"} size={22} color={activeTab === 'PROFILE' ? colors.primaryLight : colors.textSub} />
          </View>
          <Text style={[styles.navTabTitle, { color: activeTab === 'PROFILE' ? colors.text : colors.textSub }]}>Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTabCol} onPress={() => setActiveTab('CALLS')}>
          <View style={[styles.tabBadgeWrap, activeTab === 'CALLS' && { backgroundColor: '#103B35' }]}>
            <Ionicons name={activeTab === 'CALLS' ? "call" : "call-outline"} size={22} color={activeTab === 'CALLS' ? colors.primaryLight : colors.textSub} />
          </View>
          <Text style={[styles.navTabTitle, { color: activeTab === 'CALLS' ? colors.text : colors.textSub }]}>Calls</Text>
        </TouchableOpacity>
      </View>

      {/* ================= MODAL: EDIT PROFILE & PHOTO ================= */}
      <Modal visible={editProfileModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.sheetModalBox, { backgroundColor: colors.card }]}>
            <View style={styles.rowBetween}>
              <Text style={[styles.sheetHeading, { color: colors.text }]}>Edit profile</Text>
              <TouchableOpacity onPress={() => setEditProfileModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={{ alignItems: 'center', marginVertical: 14 }}>
              <Image source={{ uri: editAvatar }} style={styles.modalAvatarEdit} />
              <TouchableOpacity
                onPress={() => openDeviceGallery(uri => setEditAvatar(uri))}
                style={[styles.chooseGalleryBtn, { backgroundColor: colors.itemHover }]}
              >
                <Ionicons name="camera" size={18} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700', marginLeft: 6 }}>
                  Change Photo from Gallery
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={{ color: colors.textSub, fontSize: 12 }}>Name</Text>
            <TextInput
              style={[styles.editSingleInput, { color: colors.text, borderBottomColor: colors.primary }]}
              value={editName}
              onChangeText={setEditName}
            />

            <Text style={{ color: colors.textSub, fontSize: 12, marginTop: 14 }}>About</Text>
            <TextInput
              style={[styles.editSingleInput, { color: colors.text, borderBottomColor: colors.primary }]}
              value={editBio}
              onChangeText={setEditBio}
            />

            <TouchableOpacity onPress={handleSaveProfileChanges} style={[styles.waButton, { backgroundColor: colors.primary, marginTop: 20 }]}>
              <Text style={styles.waBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: ADD CONTACT BY NUMBER ================= */}
      <Modal visible={addFriendModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.sheetModalBox, { backgroundColor: colors.card }]}>
            <View style={styles.rowBetween}>
              <Text style={[styles.sheetHeading, { color: colors.text }]}>New contact</Text>
              <TouchableOpacity onPress={() => setAddFriendModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.editSingleInput, { color: colors.text, borderBottomColor: colors.primary, marginTop: 14 }]}
              placeholder="First name"
              placeholderTextColor={colors.textSub}
              value={newFriendName}
              onChangeText={setNewFriendName}
            />

            <TextInput
              style={[styles.editSingleInput, { color: colors.text, borderBottomColor: colors.primary, marginTop: 14 }]}
              placeholder="Phone number (+91)"
              placeholderTextColor={colors.textSub}
              keyboardType="phone-pad"
              value={newFriendPhone}
              onChangeText={setNewFriendPhone}
            />

            <TouchableOpacity onPress={handleAddFriend} style={[styles.waButton, { backgroundColor: colors.primary, marginTop: 24 }]}>
              <Text style={styles.waBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: POST STATUS FROM GALLERY ================= */}
      <Modal visible={addStatusModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.sheetModalBox, { backgroundColor: colors.card }]}>
            <View style={styles.rowBetween}>
              <Text style={[styles.sheetHeading, { color: colors.text }]}>Add status</Text>
              <TouchableOpacity onPress={() => setAddStatusModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => openDeviceGallery(uri => setSelectedStatusPhoto(uri))}
              style={[styles.gallerySelectCard, { borderColor: colors.primary }]}
            >
              <Ionicons name="images" size={32} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginTop: 6, fontSize: 14 }}>
                {selectedStatusPhoto ? "✅ Photo selected (tap to change)" : "📂 Choose photo from Phone Gallery"}
              </Text>
            </TouchableOpacity>

            <TextInput
              style={[styles.editSingleInput, { color: colors.text, borderBottomColor: colors.primary, marginTop: 12 }]}
              placeholder="Add a caption..."
              placeholderTextColor={colors.textSub}
              value={statusCaption}
              onChangeText={setStatusCaption}
            />

            <TouchableOpacity onPress={handlePostStatus} style={[styles.waButton, { backgroundColor: colors.primary, marginTop: 18 }]}>
              <Text style={styles.waBtnText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: FULL SCREEN STORY VIEWER ================= */}
      <Modal visible={!!activeStoryGroup} animationType="fade" transparent={false}>
        {activeStoryGroup && (
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <Image
              source={{ uri: activeStoryGroup.stories[currentStoryIndex]?.media }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
            <View style={styles.storyTopNavRow}>
              <Image source={{ uri: activeStoryGroup.user?.avatar }} style={styles.cardMiniAvatar} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>{activeStoryGroup.user?.name}</Text>
                <Text style={{ color: '#E0E7FF', fontSize: 11 }}>{activeStoryGroup.stories[currentStoryIndex]?.time || 'Just now'}</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveStoryGroup(null)}>
                <Ionicons name="close" size={28} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

registerRootComponent(App);

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  // Auth
  authPage: { flex: 1, padding: 24, justifyContent: 'center' },
  authHeader: { alignItems: 'center', marginBottom: 28 },
  authHeading: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  authDescription: { color: '#8696A0', fontSize: 13, textAlign: 'center', marginTop: 10, lineHeight: 18 },
  phoneBox: { alignItems: 'center', marginVertical: 14 },
  codePill: { width: 220, borderBottomWidth: 1.5, paddingBottom: 6, alignItems: 'center', marginBottom: 14 },
  phoneField: { width: 220, borderBottomWidth: 1.5, paddingBottom: 6, fontSize: 18, textAlign: 'center' },
  otpField: { width: 160, borderBottomWidth: 1.5, paddingBottom: 6, fontSize: 22, textAlign: 'center', alignSelf: 'center', letterSpacing: 6 },
  waButton: { height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, alignSelf: 'center', minWidth: 120 },
  waBtnText: { color: '#000', fontSize: 14, fontWeight: '800' },
  largeAvatarCircle: { width: 90, height: 90, borderRadius: 45 },
  cameraFloatBadge: { position: 'absolute', bottom: 0, right: -4, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  profileInputLine: { width: '80%', borderBottomWidth: 1.5, paddingBottom: 6, fontSize: 15, alignSelf: 'center' },
  // Top App Bar
  waTopBar: { paddingTop: 45, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  waBrandTitle: { fontSize: 21, fontWeight: '700' },
  waTopIcons: { flexDirection: 'row', alignItems: 'center' },
  topIconBtn: { marginLeft: 16 },
  searchPillBox: { height: 42, borderRadius: 21, flexDirection: 'row', alignItems: 'center', marginHorizontal: 14, marginVertical: 8, paddingHorizontal: 16 },
  searchPillText: { marginLeft: 10, fontSize: 14 },
  // Chats
  chatRowItem: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' },
  avatarCircle: { width: 50, height: 50, borderRadius: 25 },
  statusRingBorder: { position: 'absolute', top: -3, left: -3, width: 56, height: 56, borderRadius: 28, borderWidth: 2 },
  chatDetailsCol: { flex: 1, marginLeft: 14, paddingBottom: 10, borderBottomWidth: 0.5 },
  chatContactName: { fontSize: 16, fontWeight: '700' },
  chatTimeStr: { fontSize: 11 },
  lastMsgPreview: { fontSize: 13 },
  unreadBadgePill: { minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  unreadCountTxt: { color: '#000', fontSize: 10, fontWeight: '800' },
  greenFab: { position: 'absolute', bottom: 20, right: 16, width: 54, height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  // Updates & Cards
  sectionHeadingTxt: { fontSize: 17, fontWeight: '700', paddingHorizontal: 16, marginTop: 14, marginBottom: 12 },
  statusCardBox: { width: 105, height: 160, borderRadius: 16, overflow: 'hidden', marginRight: 10, padding: 8, justifyContent: 'space-between' },
  addStatusAvatarWrap: { alignItems: 'center', marginTop: 10 },
  statusCardAvatar: { width: 52, height: 52, borderRadius: 26 },
  cardGreenBadge: { position: 'absolute', bottom: -2, right: 18, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#111B21' },
  cardFooterName: { fontSize: 12, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  cardTopAvatarRing: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, padding: 2 },
  cardMiniAvatar: { width: '100%', height: '100%', borderRadius: 16 },
  cardOverlayName: { color: '#FFF', fontSize: 12, fontWeight: '700', textShadowColor: '#000', textShadowRadius: 3 },
  channelsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 16, marginTop: 18 },
  exploreBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  channelRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' },
  // Profile (Screenshot 2)
  profileTopNavBar: { paddingTop: 45, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  waBigProfileAvatar: { width: 130, height: 130, borderRadius: 65, borderWidth: 3, borderColor: '#202C33' },
  emojiStatusBubble: { position: 'absolute', top: 0, alignSelf: 'center', backgroundColor: '#202C33', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  profileBigName: { fontSize: 24, fontWeight: '700' },
  settingsMenuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  settingsIconWrap: { width: 36, alignItems: 'center', marginRight: 14 },
  settingsLabel: { fontSize: 15, fontWeight: '500' },
  // Bottom Bar
  waBottomNav: { height: 64, flexDirection: 'row', borderTopWidth: 0.5, justifyContent: 'space-around', alignItems: 'center' },
  navTabCol: { alignItems: 'center' },
  tabBadgeWrap: { paddingHorizontal: 18, paddingVertical: 3, borderRadius: 16, marginBottom: 2 },
  navTabTitle: { fontSize: 11, fontWeight: '700' },
  // Chat Room Inside
  chatHeader: { paddingTop: 45, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 0.5 },
  chatAvatar: { width: 38, height: 38, borderRadius: 19 },
  chatTitleText: { fontSize: 16, fontWeight: '700' },
  msgWrapper: { flexDirection: 'row', marginVertical: 3 },
  msgCard: { maxWidth: '80%', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  msgBody: { fontSize: 15, lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 2 },
  msgTimeStr: { fontSize: 10 },
  waChatInputBar: { flexDirection: 'row', paddingHorizontal: 6, paddingVertical: 6, alignItems: 'center' },
  inputPillBox: { flex: 1, flexDirection: 'row', alignItems: 'center', height: 44, borderRadius: 22, paddingHorizontal: 12 },
  chatTextInput: { flex: 1, fontSize: 16, marginHorizontal: 6 },
  voiceSendCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 6 },
  // Calling
  fullVideoMock: { flex: 1, justifyContent: 'space-between', paddingVertical: 60 },
  callTopBanner: { alignItems: 'center' },
  callNameText: { color: '#FFF', fontSize: 24, fontWeight: '700' },
  callTimerText: { color: '#E0E7FF', fontSize: 12, marginTop: 4 },
  callControlsRow: { flexDirection: 'row', justifyContent: 'space-evenly', width: '100%' },
  callBtnRound: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  // Modals
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheetModalBox: { padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetHeading: { fontSize: 18, fontWeight: '700' },
  modalAvatarEdit: { width: 80, height: 80, borderRadius: 40 },
  chooseGalleryBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, marginTop: 10 },
  editSingleInput: { borderBottomWidth: 1.5, paddingBottom: 6, fontSize: 15, marginTop: 6 },
  gallerySelectCard: { padding: 20, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', marginTop: 14 },
  storyTopNavRow: { position: 'absolute', top: 50, flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 16 }
});
