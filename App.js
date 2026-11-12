import React, { useState, useEffect, useRef } from 'react';
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
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const FIREBASE_PROJECT_ID = "connectx-app-beaeb";
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/messages`;

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

const LIGHT_THEME = {
  bg: '#F4F6FA',
  card: '#FFFFFF',
  text: '#111827',
  textSub: '#6B7280',
  primary: '#007AFF',
  selfBubble: '#007AFF',
  otherBubble: '#E5E7EB',
  border: '#E5E7EB',
  danger: '#DC2626',
  success: '#10B981'
};

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const colors = isDark ? DARK_THEME : LIGHT_THEME;

  const [activeTab, setActiveTab] = useState('CHATS');
  const [currentScreen, setCurrentScreen] = useState('MAIN');

  const myUserId = useRef('user_' + Math.floor(1000 + Math.random() * 9000)).current;

  const [userProfile, setUserProfile] = useState({
    name: 'Qasim (CONNECTX)',
    bio: 'Connected to live Firebase Cloud 🚀',
    phone: '+91 98765 43210',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'
  });

  const [blockedUsers, setBlockedUsers] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [callType, setCallType] = useState('video');
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [cameraFacing, setCameraFacing] = useState('front');

  const [chatMenuVisible, setChatMenuVisible] = useState(false);
  const [chatDeleteModalTarget, setChatDeleteModalTarget] = useState(null);
  const [addStatusModalVisible, setAddStatusModalVisible] = useState(false);
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
  const [addFriendModalVisible, setAddFriendModalVisible] = useState(false);

  const [activeStoryGroup, setActiveStoryGroup] = useState(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  const [editName, setEditName] = useState(userProfile.name);
  const [editBio, setEditBio] = useState(userProfile.bio);
  const [editAvatar, setEditAvatar] = useState(userProfile.avatar);
  const [newFriendName, setNewFriendName] = useState('');
  const [newFriendPhone, setNewFriendPhone] = useState('');
  const [statusCaption, setStatusCaption] = useState('');
  const [selectedStatusPhoto, setSelectedStatusPhoto] = useState('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800');

  const openDeviceGallery = (onImageSelected) => {
    try {
      if (typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = e.target && e.target.files && e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (uploadEvent) => {
              if (uploadEvent.target && uploadEvent.target.result) {
                onImageSelected(uploadEvent.target.result);
              }
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      }
    } catch (err) {
      console.log('Gallery open error:', err);
    }
  };

  const [myStatuses, setMyStatuses] = useState([
    {
      id: 'my_1',
      media: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
      caption: 'Live on Google Firebase Cloud 🌐',
      timeFormatted: 'Today, 9:25 AM',
      remainingHours: '24h remaining',
      viewers: []
    }
  ]);

  const [friendsStories] = useState([
    {
      user: {
        id: 'c1',
        name: 'Sarah Connor',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
      },
      stories: [
        {
          id: 's1_1',
          media: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800',
          caption: 'Ready for live testing 🚀',
          timeFormatted: '10m ago',
          remainingHours: '23h remaining'
        }
      ]
    }
  ]);

  const [chats, setChats] = useState([
    {
      id: 'c1',
      name: 'Sarah Connor',
      phone: '+1 202 555 0143',
      type: 'direct',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      lastMsg: 'Waiting for your message...',
      time: 'Just now',
      unread: 0,
      online: true
    }
  ]);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');

  const fetchCloudMessages = async () => {
    try {
      const response = await fetch(FIRESTORE_URL);
      if (!response.ok) return;

      const data = await response.json();
      if (data && data.documents) {
        const parsedList = data.documents.map((doc) => {
          const f = doc.fields || {};
          return {
            id: doc.name.split('/').pop(),
            text: f.text ? f.text.stringValue : '',
            senderId: f.senderId ? f.senderId.stringValue : '',
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
    fetchCloudMessages();
    const interval = setInterval(fetchCloudMessages, 2500);
    return () => clearInterval(interval);
  }, []);

  const sendMessageToCloud = async () => {
    if (!inputText.trim()) return;

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
      senderId: myUserId,
      senderName: userProfile.name,
      time: timeFormatted,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      await fetch(FIRESTORE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            text: { stringValue: textToSend },
            senderId: { stringValue: myUserId },
            senderName: { stringValue: userProfile.name },
            time: { stringValue: timeFormatted },
            timestamp: { integerValue: String(Date.now()) }
          }
        })
      });
      fetchCloudMessages();
    } catch (e) {
      console.log('Send error:', e);
    }
  };

  const isCurrentChatBlocked = selectedChat ? blockedUsers.includes(selectedChat.id) : false;

  const toggleBlockContact = (contactId) => {
    if (blockedUsers.includes(contactId)) {
      setBlockedUsers(prev => prev.filter(id => id !== contactId));
    } else {
      setBlockedUsers(prev => [...prev, contactId]);
    }
    setChatMenuVisible(false);
  };

  const deleteEntireChat = (chatId) => {
    setChats(prev => prev.filter(c => c.id !== chatId));
    setChatDeleteModalTarget(null);
    setChatMenuVisible(false);
    if (selectedChat?.id === chatId) {
      setCurrentScreen('MAIN');
      setSelectedChat(null);
    }
  };

  const postNewStatus = () => {
    if (!statusCaption.trim() && !selectedStatusPhoto) return;
    const newStatusEntry = {
      id: 'my_' + Date.now(),
      media: selectedStatusPhoto,
      caption: statusCaption.trim() || 'My Status',
      timeFormatted: 'Just now',
      remainingHours: '24h remaining',
      viewers: []
    };
    setMyStatuses(prev => [newStatusEntry, ...prev]);
    setStatusCaption('');
    setAddStatusModalVisible(false);
  };

  const saveProfile = () => {
    setUserProfile({
      ...userProfile,
      name: editName.trim() || userProfile.name,
      bio: editBio.trim() || userProfile.bio,
      avatar: editAvatar
    });
    setEditProfileModalVisible(false);
  };

  const addNewFriendByPhone = () => {
    if (!newFriendPhone.trim()) return;
    const friendName = newFriendName.trim() || `Friend (${newFriendPhone.slice(-4)})`;
    const newChatEntry = {
      id: 'friend_' + Date.now(),
      name: friendName,
      phone: newFriendPhone.trim(),
      type: 'direct',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      lastMsg: 'Tap to start conversation',
      time: 'Just now',
      unread: 0,
      online: true
    };
    setChats(prev => [newChatEntry, ...prev]);
    setSelectedChat(newChatEntry);
    setNewFriendName('');
    setNewFriendPhone('');
    setAddFriendModalVisible(false);
    setCurrentScreen('CHAT');
  };

  const currentViewingStory = activeStoryGroup
    ? activeStoryGroup.stories[currentStoryIndex]
    : null;

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
                  <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>
                    {cameraFacing === 'front' ? 'Selfie Cam' : 'Rear Cam'}
                  </Text>
                  <Text style={{ color: '#8E95A5', fontSize: 8 }}>Live Cloud Feed</Text>
                </View>
              ) : (
                <View style={styles.camFallback}>
                  <Ionicons name="videocam-off" size={24} color="#FF453A" />
                  <Text style={{ color: '#FFF', fontSize: 9, marginTop: 4 }}>Cam Off</Text>
                </View>
              )}
            </View>
            <View style={styles.topCallBanner}>
              <Text style={styles.callNameText}>{selectedChat?.name || 'User'}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.statusPill, { backgroundColor: isSpeakerOn ? '#0A84FF' : '#374151' }]}>
                  <Ionicons name={isSpeakerOn ? "volume-high" : "volume-medium"} size={13} color="#FFF" />
                  <Text style={styles.pillText}>{isSpeakerOn ? 'Handsfree On' : 'Earpiece'}</Text>
                </View>
                <Text style={styles.callTimerText}>01:12 • Firebase</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.audioCenterContent}>
            <Image source={{ uri: selectedChat?.avatar }} style={styles.largeCallAvatar} />
            <Text style={styles.callNameText}>{selectedChat?.name || 'User'}</Text>
            <View style={[styles.statusPill, { backgroundColor: isSpeakerOn ? '#0A84FF' : '#374151', marginTop: 10 }]}>
              <Ionicons name={isSpeakerOn ? "volume-high" : "volume-medium"} size={14} color="#FFF" />
              <Text style={styles.pillText}>{isSpeakerOn ? 'Handsfree On' : 'Earpiece'}</Text>
            </View>
            <Text style={styles.callTimerText}>00:45 • CONNECTX Voice</Text>
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

  if (currentScreen === 'CHAT' && selectedChat) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

        <View style={[styles.chatHeaderBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setCurrentScreen('MAIN')} style={styles.touchArea}>
            <Ionicons name="arrow-back" size={24} color={
