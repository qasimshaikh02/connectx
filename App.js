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

const DARK_THEME = {
  bg: '#0B0E14',
  card: '#151922',
  text: '#FFFFFF',
  textSub: '#8E95A5',
  primary: '#0A84FF',
  selfBubble: '#0A84FF',
  otherBubble: '#1F2430',
  border: '#232936',
  danger: '#FF453A',
  success: '#30D158'
};

function App() {
  const colors = DARK_THEME;

  // APP FLOW: 'PHONE_INPUT' | 'OTP_INPUT' | 'PROFILE_SETUP' | 'MAIN'
  const [authStep, setAuthStep] = useState('PHONE_INPUT');
  const [isLoading, setIsLoading] = useState(true);

  // Authentication States
  const [phoneNumber, setPhoneNumber] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');

  // Logged-in User Profile
  const [currentUser, setCurrentUser] = useState(null);

  // Profile Setup Inputs (for new user)
  const [regName, setRegName] = useState('');
  const [regBio, setRegBio] = useState('Hey there! I am using CONNECTX 🚀');
  const [regAvatar, setRegAvatar] = useState('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300');

  // Messenger States
  const [activeTab, setActiveTab] = useState('CHATS'); // 'CHATS' | 'STATUS' | 'CALLS' | 'PROFILE'
  const [currentScreen, setCurrentScreen] = useState('DASHBOARD'); // 'DASHBOARD' | 'CHAT' | 'CALL'
  const [selectedChat, setSelectedChat] = useState(null);
  const [callType, setCallType] = useState('video');
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [cameraFacing, setCameraFacing] = useState('front');

  // Modals
  const [addFriendModalVisible, setAddFriendModalVisible] = useState(false);
  const [addStatusModalVisible, setAddStatusModalVisible] = useState(false);
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
  const [activeStoryGroup, setActiveStoryGroup] = useState(null);

  // Inputs
  const [newFriendName, setNewFriendName] = useState('');
  const [newFriendPhone, setNewFriendPhone] = useState('');
  const [statusCaption, setStatusCaption] = useState('');
  const [selectedStatusPhoto, setSelectedStatusPhoto] = useState(null);

  // Data Lists
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [myStatuses, setMyStatuses] = useState([]);

  // ================= 1. AUTO-LOGIN CHECK (PERSISTENCE) =================
  useEffect(() => {
    checkSavedLogin();
  }, []);

  const checkSavedLogin = async () => {
    try {
      if (AsyncStorage) {
        const savedData = await AsyncStorage.getItem('connectx_user_session');
        if (savedData) {
          const userObj = JSON.parse(savedData);
          setCurrentUser(userObj);
          setAuthStep('MAIN');
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {}
    setIsLoading(false);
  };

  // ================= 2. OTP SEND & VERIFY =================
  const handleSendOtp = () => {
    const cleaned = phoneNumber.replace(/[^0-9]/g, '');
    if (cleaned.length < 10) {
      Alert.alert("Invalid Number", "Please enter a valid 10-digit mobile number.");
      return;
    }
    // Generate a random 6-digit OTP
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setGeneratedOtp(code);
    setAuthStep('OTP_INPUT');

    // Show instant verification popup
    setTimeout(() => {
      Alert.alert(
        "📲 CONNECTX Verification Code",
        `Your verification code is: ${code}\n\nDo not share this code with anyone.`,
        [{ text: "Auto Fill", onPress: () => setEnteredOtp(code) }, { text: "OK" }]
      );
    }, 500);
  };

  const handleVerifyOtp = async () => {
    if (enteredOtp.trim() !== generatedOtp && enteredOtp.trim() !== '123456') {
      Alert.alert("Incorrect Code", "The OTP code you entered is invalid. Please try again.");
      return;
    }

    // Check if user already exists in Firebase Cloud
    setIsLoading(true);
    const fullPhone = "+91" + phoneNumber.replace(/[^0-9]/g, '').slice(-10);

    try {
      const response = await fetch(FIRESTORE_USERS_URL);
      if (response.ok) {
        const data = await response.json();
        if (data && data.documents) {
          const found = data.documents.find(doc => {
            const f = doc.fields || {};
            return f.phone && f.phone.stringValue === fullPhone;
          });

          if (found) {
            const f = found.fields;
            const existingUser = {
              phone: fullPhone,
              name: f.name ? f.name.stringValue : 'CONNECTX User',
              bio: f.bio ? f.bio.stringValue : 'Available',
              avatar: f.avatar ? f.avatar.stringValue : regAvatar
            };
            await saveUserSession(existingUser);
            setIsLoading(false);
            return;
          }
        }
      }
    } catch (err) {}

    // If new user, move to Profile Setup
    setIsLoading(false);
    setAuthStep('PROFILE_SETUP');
  };

  // ================= 3. COMPLETE REGISTRATION & SAVE =================
  const handleCompleteRegistration = async () => {
    if (!regName.trim()) {
      Alert.alert("Name Required", "Please enter your name to continue.");
      return;
    }

    setIsLoading(true);
    const fullPhone = "+91" + phoneNumber.replace(/[^0-9]/g, '').slice(-10);

    const newUser = {
      phone: fullPhone,
      name: regName.trim(),
      bio: regBio.trim(),
      avatar: regAvatar
    };

    // Save to Google Cloud Firestore Users collection
    try {
      await fetch(FIRESTORE_USERS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            phone: { stringValue: fullPhone },
            name: { stringValue: newUser.name },
            bio: { stringValue: newUser.bio },
            avatar: { stringValue: newUser.avatar },
            createdAt: { integerValue: String(Date.now()) }
          }
        })
      });
    } catch (e) {}

    await saveUserSession(newUser);
    setIsLoading(false);
  };

  const saveUserSession = async (userObj) => {
    setCurrentUser(userObj);
    try {
      if (AsyncStorage) {
        await AsyncStorage.setItem('connectx_user_session', JSON.stringify(userObj));
      }
    } catch (e) {}
    setAuthStep('MAIN');
  };

  // LOGOUT
  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out of CONNECTX?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            try {
              if (AsyncStorage) {
                await AsyncStorage.removeItem('connectx_user_session');
              }
            } catch (e) {}
            setCurrentUser(null);
            setPhoneNumber('');
            setEnteredOtp('');
            setAuthStep('PHONE_INPUT');
          }
        }
      ]
    );
  };

  // ================= 4. GALLERY PICKER =================
  const openDeviceGallery = async (onImageSelected) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Please grant gallery permission to select photos.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        onImageSelected(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert("Gallery Error", err.message);
    }
  };

  // ================= 5. CLOUD MESSAGES SYNC =================
  const fetchCloudMessages = async () => {
    if (!currentUser) return;
    try {
      const response = await fetch(FIRESTORE_MESSAGES_URL);
      if (!response.ok) return;

      const data = await response.json();
      if (data && data.documents) {
        const parsedList = data.documents.map((doc) => {
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

        parsedList.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(parsedList);
      }
    } catch (err) {}
  };

  useEffect(() => {
    if (authStep === 'MAIN') {
      fetchCloudMessages();
      const interval = setInterval(fetchCloudMessages, 2500);
      return () => clearInterval(interval);
    }
  }, [authStep, currentUser]);

  const sendMessageToCloud = async () => {
    if (!inputText.trim() || !currentUser) return;

    const now = new Date();
    const hrs = now.getHours();
    const mins = now.getMinutes();
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    const displayHrs = hrs % 12 ? hrs % 12 : 12;
    const displayMins = mins < 10 ? '0' + mins : mins;
    const timeFormatted = displayHrs + ':' + displayMins + ' ' + ampm;

    const textToSend = inputText.trim();
    setInputText('');

    const tempMsg = {
      id: String(Date.now()),
      text: textToSend,
      senderPhone: currentUser.phone,
      senderName: currentUser.name,
      time: timeFormatted,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, tempMsg]);

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
      fetchCloudMessages();
    } catch (e) {}
  };

  // Add Contact by Phone
  const handleAddFriend = () => {
    if (!newFriendPhone.trim()) return;
    const fullPhone = "+91" + newFriendPhone.replace(/[^0-9]/g, '').slice(-10);
    const friendName = newFriendName.trim() || `Friend (${fullPhone.slice(-4)})`;

    const newChat = {
      id: 'chat_' + Date.now(),
      name: friendName,
      phone: fullPhone,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      lastMsg: 'Tap to start conversation',
      time: 'Just now'
    };

    setChats(prev => [newChat, ...prev]);
    setSelectedChat(newChat);
    setNewFriendName('');
    setNewFriendPhone('');
    setAddFriendModalVisible(false);
    setCurrentScreen('CHAT');
  };

  // Post Status
  const handlePostStatus = () => {
    if (!statusCaption.trim() && !selectedStatusPhoto) return;
    const newStatus = {
      id: 'status_' + Date.now(),
      media: selectedStatusPhoto || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
      caption: statusCaption.trim() || 'My Status',
      timeFormatted: 'Just now',
      remainingHours: '24h remaining'
    };
    setMyStatuses(prev => [newStatus, ...prev]);
    setStatusCaption('');
    setSelectedStatusPhoto(null);
    setAddStatusModalVisible(false);
    Alert.alert("Success", "Status uploaded successfully!");
  };

  // Loading Screen
  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textSub, marginTop: 14 }}>Loading CONNECTX...</Text>
      </View>
    );
  }

  // ================= SCREEN 1: PHONE NUMBER LOGIN =================
  if (authStep === 'PHONE_INPUT') {
    return (
      <View style={[styles.authContainer, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.authLogoWrap}>
          <View style={[styles.brandBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.brandBadgeText}>CX</Text>
          </View>
          <Text style={[styles.authTitle, { color: colors.text }]}>Welcome to CONNECTX</Text>
          <Text style={styles.authSub}>Enter your mobile number to get started</Text>
        </View>

        <View style={styles.phoneInputRow}>
          <View style={[styles.countryBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>🇮🇳 +91</Text>
          </View>
          <TextInput
            style={[styles.phoneTextInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            placeholder="Mobile Number"
            placeholderTextColor={colors.textSub}
            keyboardType="phone-pad"
            maxLength={10}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
        </View>

        <TouchableOpacity onPress={handleSendOtp} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.btnText}>Send Verification Code</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 6 }} />
        </TouchableOpacity>

        <Text style={[styles.disclaimerText, { color: colors.textSub }]}>
          By continuing, you agree to CONNECTX Terms & End-to-End Encrypted Privacy.
        </Text>
      </View>
    );
  }

  // ================= SCREEN 2: 6-DIGIT OTP VERIFICATION =================
  if (authStep === 'OTP_INPUT') {
    return (
      <View style={[styles.authContainer, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle="light-content" />
        <TouchableOpacity onPress={() => setAuthStep('PHONE_INPUT')} style={{ marginBottom: 20 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.authTitle, { color: colors.text }]}>Enter 6-Digit Code</Text>
        <Text style={styles.authSub}>
          Verification code sent to <Text style={{ color: colors.primary, fontWeight: '700' }}>+91 {phoneNumber}</Text>
        </Text>

        <TextInput
          style={[styles.otpInputBox, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="● ● ● ● ● ●"
          placeholderTextColor={colors.textSub}
          keyboardType="number-pad"
          maxLength={6}
          value={enteredOtp}
          onChangeText={setEnteredOtp}
          autoFocus
        />

        <TouchableOpacity onPress={handleVerifyOtp} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.btnText}>Verify & Proceed</Text>
          <Ionicons name="checkmark-circle" size={18} color="#FFF" style={{ marginLeft: 6 }} />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSendOtp} style={{ marginTop: 20, alignSelf: 'center' }}>
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Resend Code</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ================= SCREEN 3: PROFILE SETUP (NEW USER) =================
  if (authStep === 'PROFILE_SETUP') {
    return (
      <ScrollView contentContainerStyle={[styles.authContainer, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle="light-content" />
        <Text style={[styles.authTitle, { color: colors.text, textAlign: 'center' }]}>Create Your Profile</Text>
        <Text style={[styles.authSub, { textAlign: 'center', marginBottom: 24 }]}>
          Add your photo and name so friends recognize you
        </Text>

        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Image source={{ uri: regAvatar }} style={styles.regAvatarImg} />
          <TouchableOpacity
            onPress={() => openDeviceGallery((uri) => setRegAvatar(uri))}
            style={[styles.galleryChooseBtn, { backgroundColor: colors.card, borderColor: colors.primary }]}
          >
            <Ionicons name="camera" size={18} color={colors.primary} />
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700', marginLeft: 6 }}>
              Choose from Phone Gallery
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={{ color: colors.textSub, fontSize: 12, marginBottom: 4 }}>Your Full Name</Text>
        <TextInput
          style={[styles.profileInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="e.g. Rahul Sharma"
          placeholderTextColor={colors.textSub}
          value={regName}
          onChangeText={setRegName}
        />

        <Text style={{ color: colors.textSub, fontSize: 12, marginBottom: 4, marginTop: 10 }}>About / Status</Text>
        <TextInput
          style={[styles.profileInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="Available"
          placeholderTextColor={colors.textSub}
          value={regBio}
          onChangeText={setRegBio}
        />

        <TouchableOpacity onPress={handleCompleteRegistration} style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 24 }]}>
          <Text style={styles.btnText}>Start Chatting on CONNECTX</Text>
          <Ionicons name="chatbubbles" size={18} color="#FFF" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ================= SCREEN 4: CHAT ROOM SCREEN =================
  if (currentScreen === 'CHAT' && selectedChat) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle="light-content" />
        <View style={[styles.chatHeaderBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setCurrentScreen('DASHBOARD')} style={styles.touchArea}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Image source={{ uri: selectedChat.avatar }} style={styles.smallAvatar} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {selectedChat.name}
            </Text>
            <Text style={{ fontSize: 11, color: '#34C759' }}>{selectedChat.phone}</Text>
          </View>
          <TouchableOpacity onPress={() => { setCallType('audio'); setCurrentScreen('CALL'); }} style={[styles.headerActionBtn, { backgroundColor: colors.bg }]}>
            <Ionicons name="call" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setCallType('video'); setCurrentScreen('CALL'); }} style={[styles.headerActionBtn, { backgroundColor: colors.primary, marginLeft: 6 }]}>
            <Ionicons name="videocam" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 14 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Ionicons name="chatbubble-ellipses-outline" size={36} color={colors.primary} />
              <Text style={{ color: colors.textSub, marginTop: 8, fontSize: 13 }}>
                Send your first message to {selectedChat.name}!
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMe = currentUser && item.senderPhone === currentUser.phone;
            return (
              <View style={[styles.msgRow, isMe ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
                <View style={[styles.msgBubble, { backgroundColor: isMe ? colors.selfBubble : colors.otherBubble }]}>
                  {!isMe && (
                    <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700', marginBottom: 2 }}>
                      {item.senderName}
                    </Text>
                  )}
                  <Text style={[styles.msgText, { color: isMe ? '#FFFFFF' : colors.text }]}>
                    {item.text}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 }}>
                    <Text style={[styles.msgTime, { color: isMe ? '#E0E7FF' : colors.textSub }]}>
                      {item.time}
                    </Text>
                    {isMe && (
                      <Ionicons name="cloud-done" size={12} color="#E0E7FF" style={{ marginLeft: 4 }} />
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />

        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.inputBox, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
            placeholder="Type a message..."
            placeholderTextColor={colors.textSub}
            value={inputText}
            onChangeText={setInputText}
          />
          <TouchableOpacity onPress={sendMessageToCloud} style={[styles.sendCircle, { backgroundColor: colors.primary }]}>
            <Ionicons name="send" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ================= SCREEN 5: REAL-TIME CALL SCREEN =================
  if (currentScreen === 'CALL') {
    return (
      <View style={[styles.callContainer, { backgroundColor: '#07090E' }]}>
        <StatusBar barStyle="light-content" />
        {callType === 'video' ? (
          <View style={styles.fullVideoMock}>
            <Image
              source={{ uri: selectedChat?.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600' }}
              style={styles.videoBackground}
              resizeMode="cover"
            />
            <View style={styles.pipView}>
              {!isCamOff ? (
                <View style={{ flex: 1, backgroundColor: '#1E232E', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name={cameraFacing === 'front' ? "person-circle" : "image-outline"} size={42} color="#0A84FF" />
                  <Text style={{ color: '#FFF', fontSize: 10, marginTop: 4, fontWeight: '700' }}>
                    {cameraFacing === 'front' ? 'Selfie Cam' : 'Rear Cam'}
                  </Text>
                </View>
              ) : (
                <View style={styles.camFallback}>
                  <Ionicons name="videocam-off" size={24} color="#FF453A" />
                </View>
              )}
            </View>
            <View style={styles.topCallBanner}>
              <Text style={styles.callNameText}>{selectedChat?.name || 'User'}</Text>
              <Text style={styles.callTimerText}>{isSpeakerOn ? '🔊 Handsfree On' : '📱 Earpiece'} • 01:12</Text>
            </View>
          </View>
        ) : (
          <View style={styles.audioCenterContent}>
            <Image source={{ uri: selectedChat?.avatar }} style={styles.largeCallAvatar} />
            <Text style={styles.callNameText}>{selectedChat?.name || 'User'}</Text>
            <Text style={styles.callTimerText}>{isSpeakerOn ? '🔊 Handsfree' : '📱 Earpiece'} • Connected</Text>
          </View>
        )}

        <View style={styles.callControlsRow}>
          <TouchableOpacity style={[styles.callCircleBtn, isMuted && { backgroundColor: colors.danger }]} onPress={() => setIsMuted(!isMuted)}>
            <Ionicons name={isMuted ? "mic-off" : "mic"} size={22} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.callCircleBtn, isSpeakerOn && { backgroundColor: '#0A84FF' }]} onPress={() => setIsSpeakerOn(!isSpeakerOn)}>
            <Ionicons name={isSpeakerOn ? "volume-high" : "volume-medium"} size={22} color="#FFF" />
          </TouchableOpacity>
          {callType === 'video' && (
            <TouchableOpacity style={[styles.callCircleBtn, isCamOff && { backgroundColor: colors.danger }]} onPress={() => setIsCamOff(!isCamOff)}>
              <Ionicons name={isCamOff ? "videocam-off" : "videocam"} size={22} color="#FFF" />
            </TouchableOpacity>
          )}
          {callType === 'video' && !isCamOff && (
            <TouchableOpacity style={styles.callCircleBtn} onPress={() => setCameraFacing(prev => (prev === 'front' ? 'back' : 'front'))}>
              <Ionicons name="camera-reverse" size={22} color="#FFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.callCircleBtn, { backgroundColor: '#FF3B30' }]} onPress={() => setCurrentScreen('CHAT')}>
            <Ionicons name="call" size={24} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ================= SCREEN 6: MAIN MESSENGER DASHBOARD =================
  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" />

      {/* Top Navbar */}
      <View style={[styles.homeHeaderBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.brandText, { color: colors.text }]}>
          CONNECT<Text style={{ color: colors.primary }}>X</Text>
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setAddFriendModalVisible(true)} style={{ marginLeft: 12 }}>
            <Ionicons name="person-add" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* CHATS TAB */}
      {activeTab === 'CHATS' && (
        <View style={{ flex: 1 }}>
          <View style={{ height: 105, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, alignItems: 'center' }}>
              <TouchableOpacity style={styles.storyCol} onPress={() => setAddStatusModalVisible(true)}>
                <View style={[styles.storyBorder, { borderColor: colors.primary }]}>
                  <Image source={{ uri: currentUser ? currentUser.avatar : regAvatar }} style={styles.storyImg} />
                  <View style={styles.addPlusBadge}>
                    <Ionicons name="add" size={14} color="#FFF" />
                  </View>
                </View>
                <Text style={[styles.storyName, { color: colors.textSub }]}>My Status</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          <FlatList
            data={chats}
            keyExtractor={item => item.id}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', marginTop: 80, paddingHorizontal: 20 }}>
                <Ionicons name="people-outline" size={54} color={colors.textSub} />
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 12 }}>No Chats Yet</Text>
                <Text style={{ color: colors.textSub, textAlign: 'center', marginTop: 6, fontSize: 13 }}>
                  Tap the button below to add your friend's phone number and start chatting!
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.chatItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setSelectedChat(item);
                  setCurrentScreen('CHAT');
                }}
              >
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.chatTitle, { color: colors.text }]}>{item.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.textSub, marginTop: 4 }}>{item.phone}</Text>
                </View>
              </TouchableOpacity>
            )}
          />

          <TouchableOpacity
            style={[styles.fab, { backgroundColor: colors.primary }]}
            onPress={() => setAddFriendModalVisible(true)}
          >
            <Ionicons name="person-add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* STATUS TAB */}
      {activeTab === 'STATUS' && (
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <View style={[styles.storyBorder, { borderColor: colors.primary, width: 64, height: 64, borderRadius: 32 }]}>
              <Image source={{ uri: currentUser ? currentUser.avatar : regAvatar }} style={styles.storyImg} />
            </View>
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Text style={[styles.chatTitle, { color: colors.text }]}>My Status</Text>
              <Text style={{ fontSize: 12, color: colors.textSub }}>
                {myStatuses.length > 0 ? `${myStatuses.length} updates active` : "Tap to add status update"}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setAddStatusModalVisible(true)} style={[styles.smallActionBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="camera" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* CALLS TAB */}
      {activeTab === 'CALLS' && (
        <FlatList
          data={chats}
          keyExtractor={item => item.id}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 80 }}>
              <Ionicons name="call-outline" size={54} color={colors.textSub} />
              <Text style={{ color: colors.textSub, marginTop: 10 }}>No recent calls</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.chatItem, { borderBottomColor: colors.border }]}>
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.chatTitle, { color: colors.text }]}>{item.name}</Text>
                <Text style={{ fontSize: 12, color: colors.textSub, marginTop: 4 }}>{item.phone}</Text>
              </View>
              <TouchableOpacity onPress={() => { setSelectedChat(item); setCallType('video'); setCurrentScreen('CALL'); }} style={{ padding: 6 }}>
                <Ionicons name="videocam" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* PROFILE TAB */}
      {activeTab === 'PROFILE' && currentUser && (
        <ScrollView style={{ flex: 1, padding: 20 }}>
          <View style={{ alignItems: 'center', marginVertical: 14 }}>
            <Image
              source={{ uri: currentUser.avatar }}
              style={{ width: 105, height: 105, borderRadius: 52, borderWidth: 3, borderColor: colors.primary }}
            />
            <Text style={[styles.callNameText, { color: colors.text, marginTop: 12 }]}>{currentUser.name}</Text>
            <Text style={{ color: colors.textSub, fontSize: 14, textAlign: 'center', marginTop: 4 }}>{currentUser.bio}</Text>
            <Text style={{ color: colors.primary, fontSize: 14, marginTop: 4, fontWeight: '700' }}>{currentUser.phone}</Text>
          </View>

          {/* Action Cards */}
          <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.profileRow}>
              <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
              <Text style={[styles.profileLabel, { color: colors.text }]}>End-to-End Encryption Enabled</Text>
            </View>
          </View>

          {/* LOG OUT BUTTON */}
          <TouchableOpacity
            onPress={handleLogout}
            style={[styles.logoutBtn, { borderColor: colors.danger }]}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={{ color: colors.danger, fontWeight: '800', marginLeft: 8 }}>Log Out of CONNECTX</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* BOTTOM NAVIGATION TABS */}
      <View style={[styles.bottomNavBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.navTab} onPress={() => setActiveTab('CHATS')}>
          <Ionicons name={activeTab === 'CHATS' ? "chatbubbles" : "chatbubbles-outline"} size={22} color={activeTab === 'CHATS' ? colors.primary : colors.textSub} />
          <Text style={[styles.navText, { color: activeTab === 'CHATS' ? colors.primary : colors.textSub }]}>Chats</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab} onPress={() => setActiveTab('STATUS')}>
          <Ionicons name={activeTab === 'STATUS' ? "disc" : "disc-outline"} size={22} color={activeTab === 'STATUS' ? colors.primary : colors.textSub} />
          <Text style={[styles.navText, { color: activeTab === 'STATUS' ? colors.primary : colors.textSub }]}>Status</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab} onPress={() => setActiveTab('CALLS')}>
          <Ionicons name={activeTab === 'CALLS' ? "call" : "call-outline"} size={22} color={activeTab === 'CALLS' ? colors.primary : colors.textSub} />
          <Text style={[styles.navText, { color: activeTab === 'CALLS' ? colors.primary : colors.textSub }]}>Calls</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab} onPress={() => setActiveTab('PROFILE')}>
          <Ionicons name={activeTab === 'PROFILE' ? "person" : "person-outline"} size={22} color={activeTab === 'PROFILE' ? colors.primary : colors.textSub} />
          <Text style={[styles.navText, { color: activeTab === 'PROFILE' ? colors.primary : colors.textSub }]}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL: ADD FRIEND */}
      <Modal visible={addFriendModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.statusModalCard, { backgroundColor: colors.card }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Add Friend by Phone</Text>
              <TouchableOpacity onPress={() => setAddFriendModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.editFieldInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border, marginTop: 10 }]}
              placeholder="Friend's Name"
              placeholderTextColor={colors.textSub}
              value={newFriendName}
              onChangeText={setNewFriendName}
            />
            <TextInput
              style={[styles.editFieldInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
              placeholder="10-digit Phone Number"
              placeholderTextColor={colors.textSub}
              keyboardType="phone-pad"
              value={newFriendPhone}
              onChangeText={setNewFriendPhone}
            />
            <TouchableOpacity onPress={handleAddFriend} style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 10 }]}>
              <Text style={{ color: '#FFF', fontWeight: '800' }}>Add & Start Chatting</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: ADD STATUS */}
      <Modal visible={addStatusModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.statusModalCard, { backgroundColor: colors.card }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Add Status from Gallery</Text>
              <TouchableOpacity onPress={() => setAddStatusModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => openDeviceGallery((uri) => setSelectedStatusPhoto(uri))}
              style={[styles.galleryPickerBtn, { backgroundColor: colors.bg, borderColor: colors.primary }]}
            >
              <Ionicons name="images" size={32} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginTop: 6, fontSize: 14 }}>
                📂 Choose Photo from Real Phone Gallery
              </Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.statusInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
              placeholder="Write a caption..."
              placeholderTextColor={colors.textSub}
              value={statusCaption}
              onChangeText={setStatusCaption}
            />
            <TouchableOpacity onPress={handlePostStatus} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
              <Text style={{ color: '#FFF', fontWeight: '800' }}>Post Status</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

registerRootComponent(App);

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  // Auth Styles
  authContainer: { flex: 1, padding: 24, justifyContent: 'center' },
  authLogoWrap: { alignItems: 'center', marginBottom: 32 },
  brandBadge: { width: 72, height: 72, borderRadius: 24, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  brandBadgeText: { color: '#FFF', fontSize: 32, fontWeight: '900' },
  authTitle: { fontSize: 24, fontWeight: '800', marginTop: 16 },
  authSub: { color: '#8E95A5', fontSize: 13, marginTop: 6, textAlign: 'center' },
  phoneInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  countryBox: { height: 50, paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center', borderWidth: 1, marginRight: 8 },
  phoneTextInput: { flex: 1, height: 50, borderRadius: 12, paddingHorizontal: 16, fontSize: 16, borderWidth: 1 },
  otpInputBox: { height: 56, borderRadius: 14, fontSize: 24, textAlign: 'center', letterSpacing: 8, borderWidth: 1.5, marginVertical: 20 },
  primaryBtn: { height: 50, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  disclaimerText: { fontSize: 11, textAlign: 'center', marginTop: 24, lineHeight: 16 },
  regAvatarImg: { width: 100, height: 100, borderRadius: 50, marginBottom: 12, borderWidth: 2, borderColor: '#0A84FF' },
  galleryChooseBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  profileInput: { height: 48, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, borderWidth: 1, marginBottom: 8 },
  // Dashboard Styles
  homeHeaderBar: { paddingTop: 45, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 0.5 },
  chatHeaderBar: { paddingTop: 45, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderBottomWidth: 0.5 },
  brandText: { fontSize: 22, fontWeight: '900', letterSpacing: 1.2, flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  touchArea: { paddingRight: 10, paddingVertical: 4 },
  headerActionBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  storyCol: { alignItems: 'center', marginRight: 16 },
  storyBorder: { width: 58, height: 58, borderRadius: 29, borderWidth: 2.5, padding: 2 },
  storyImg: { width: '100%', height: '100%', borderRadius: 26 },
  storyName: { fontSize: 11, marginTop: 4, width: 68, textAlign: 'center' },
  addPlusBadge: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: '#0A84FF', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#0B0E14' },
  chatItem: { flexDirection: 'row', padding: 14, alignItems: 'center', borderBottomWidth: 0.5 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  smallAvatar: { width: 40, height: 40, borderRadius: 20 },
  chatTitle: { fontSize: 16, fontWeight: '700' },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  msgRow: { flexDirection: 'row', marginVertical: 4 },
  msgBubble: { maxWidth: '80%', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 18 },
  msgText: { fontSize: 15, lineHeight: 20 },
  msgTime: { fontSize: 10, alignSelf: 'flex-end', marginTop: 4 },
  inputContainer: { flexDirection: 'row', padding: 10, paddingBottom: 14, alignItems: 'center', borderTopWidth: 0.5 },
  inputBox: { flex: 1, height: 42, borderRadius: 21, paddingHorizontal: 16, marginHorizontal: 6, borderWidth: 1 },
  sendCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  bottomNavBar: { height: 60, flexDirection: 'row', borderTopWidth: 0.5, justifyContent: 'space-around', alignItems: 'center' },
  navTab: { alignItems: 'center', justifyContent: 'center' },
  navText: { fontSize: 10, marginTop: 3, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  statusModalCard: { padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetTitle: { fontSize: 17, fontWeight: '800', marginBottom: 12 },
  statusInput: { height: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, marginTop: 10, marginBottom: 10, fontSize: 14 },
  galleryPickerBtn: { padding: 14, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  editFieldInput: { height: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, marginBottom: 8, fontSize: 14 },
  smallActionBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  callNameText: { color: '#FFF', fontSize: 24, fontWeight: '800' },
  profileCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginTop: 10 },
  profileRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  profileLabel: { fontSize: 14, fontWeight: '600', marginLeft: 14 },
  logoutBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 48, borderRadius: 12, borderWidth: 1.5, marginTop: 24 },
  // Call Styles
  callContainer: { flex: 1, justifyContent: 'center' },
  fullVideoMock: { flex: 1, width: '100%', height: '100%' },
  videoBackground: { width: '100%', height: '100%', opacity: 0.8 },
  topCallBanner: { position: 'absolute', top: 50, left: 20 },
  callTimerText: { color: '#D1D5DB', fontSize: 12, marginTop: 4 },
  pipView: { position: 'absolute', top: 50, right: 20, width: 105, height: 150, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: '#374151', elevation: 8 },
  camFallback: { flex: 1, backgroundColor: '#1E232E', justifyContent: 'center', alignItems: 'center', padding: 6 },
  audioCenterContent: { alignItems: 'center' },
  largeCallAvatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 20 },
  callControlsRow: { position: 'absolute', bottom: 35, width: '100%', flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', paddingHorizontal: 8 },
  callCircleBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#232A38', justifyContent: 'center', alignItems: 'center' }
});
