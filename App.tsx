import 'react-native-url-polyfill/auto';
import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';

// --- Firebase ---
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app'; // Import FirebaseApp type
import {
  getAuth,
  // initializeAuth, // <- REMOVED
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
  Auth, // Import Auth type
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy,
  doc,
  Timestamp,
  Firestore, // Import Firestore type
} from 'firebase/firestore';
// import { getReactNativePersistence } from 'firebase/auth/react-native'; // <- REMOVED
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// --- Navigation ---
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import {
  createBottomTabNavigator,
  BottomTabScreenProps,
} from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// --- Firebase Config ---
// !! PASTE YOUR FIREBASE CONFIG OBJECT HERE
// You can get this from your Firebase project settings
const firebaseConfig = {
  apiKey: "key",
  authDomain: "lostdfou",
  projectId: "loandound",
  storageBucket: "lostandfoud",
  messagingSenderId: "10525",
  appId: "1:105b",
  measurementId: "G"
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  // ADDED: New, simpler v10+ initialization.
  // This implicitly handles persistence in React Native
  // because AsyncStorage is installed.
  // We initialize auth and db here, *after* app is guaranteed to be set.
  auth = getAuth(app);
  db = getFirestore(app);

} catch (error) {
  console.error('Firebase initialization error', error);
  Alert.alert('Error', 'Could not connect to Firebase.');
  // If Firebase fails, we must stop the app.
  throw new Error('Firebase initialization failed!');
}


// --- Types ---
interface Item {
  id: string;
  title: string;
  description: string;
  location?: string;
  item_type: 'lost' | 'found';
  user_id: string;
  created_at: Timestamp; // Use Firestore Timestamp
}

// Context for managing auth
type AuthContextType = {
  user: User | null;
  loading: boolean;
};
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

// Auth provider component
const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChanged returns an unsubscribe function
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setUser(user);
        setLoading(false);
      },
      (error) => {
        console.error('Auth state error', error);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to access auth context
const useAuth = () => {
  return useContext(AuthContext);
};

// --- Screen Types ---

// Auth Stack
type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};
type LoginProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;
type SignUpProps = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

// App Tabs
type AppTabParamList = {
  Feed: undefined;
  Post: undefined;
  Profile: undefined;
};
type FeedProps = BottomTabScreenProps<AppTabParamList, 'Feed'>;
type PostProps = BottomTabScreenProps<AppTabParamList, 'Post'>;
type ProfileProps = BottomTabScreenProps<AppTabParamList, 'Profile'>;

// Root Stack
type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

// --- Auth Screens ---

const LoginScreen = ({ navigation }: LoginProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Auth listener will handle navigation
    } catch (error: any) {
      Alert.alert('Login Error', error.message);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.authInner}>
        <Text style={styles.authTitle}>Welcome Back</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonTextPrimary}>Login</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => navigation.navigate('SignUp')}
          disabled={loading}
        >
          <Text style={styles.buttonTextSecondary}>Need an account? Sign Up</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const SignUpScreen = ({ navigation }: SignUpProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // Auth listener will handle navigation
      Alert.alert('Success', 'Account created! You are now logged in.');
    } catch (error: any) {
      Alert.alert('Sign Up Error', error.message);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.authInner}>
        <Text style={styles.authTitle}>Create Account</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonTextPrimary}>Sign Up</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => navigation.navigate('Login')}
          disabled={loading}
        >
          <Text style={styles.buttonTextSecondary}>Have an account? Login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

// --- App Screens ---

const FeedScreen = ({ navigation }: FeedProps) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'lost' | 'found'>('all');

  useEffect(() => {
    setLoading(true);

    // Base query: collection 'items', order by creation date descending
    let itemsQuery = query(
      collection(db, 'items'),
      orderBy('created_at', 'desc')
    );

    // Add filter if not 'all'
    if (filter !== 'all') {
      itemsQuery = query(
        collection(db, 'items'),
        where('item_type', '==', filter),
        orderBy('created_at', 'desc')
      );
    }

    // Use onSnapshot for real-time updates
    const unsubscribe = onSnapshot(
      itemsQuery,
      (querySnapshot) => {
        const fetchedItems: Item[] = [];
        querySnapshot.forEach((doc) => {
          fetchedItems.push({ id: doc.id, ...doc.data() } as Item);
        });
        setItems(fetchedItems);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching items: ', error);
        Alert.alert('Error', 'Could not fetch items.');
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount or filter change
    return () => unsubscribe();
  }, [filter]); // Rerun effect when filter changes

  const renderItem = ({ item }: { item: Item }) => (
    <View style={styles.itemCard}>
      <View
        style={[
          styles.itemTypeBadge,
          item.item_type === 'lost' ? styles.badgeLost : styles.badgeFound,
        ]}
      >
        <Text style={styles.itemTypeBadgeText}>
          {item.item_type.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.itemTitle}>{item.title}</Text>
      <Text style={styles.itemDescription}>{item.description}</Text>
      {item.location && (
        <Text style={styles.itemLocation}>Location: {item.location}</Text>
      )}
      <Text style={styles.itemDate}>
        Posted:{' '}
        {item.created_at
          ? item.created_at.toDate().toLocaleDateString()
          : 'Just now'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Text style={styles.headerTitle}>Lost & Found Feed</Text>
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterActive]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'all' && styles.filterTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'lost' && styles.filterActive]}
          onPress={() => setFilter('lost')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'lost' && styles.filterTextActive,
            ]}
          >
            Lost
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'found' && styles.filterActive,
          ]}
          onPress={() => setFilter('found')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'found' && styles.filterTextActive,
            ]}
          >
            Found
          </Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={() => (
            <View style={styles.emptyList}>
              <Text style={styles.emptyListText}>No items found.</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const PostScreen = ({ navigation }: PostProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [itemType, setItemType] = useState<'lost' | 'found'>('lost');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title || !description) {
      Alert.alert('Error', 'Please fill in at least title and description.');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'You must be logged in to post.');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'items'), {
        title,
        description,
        location,
        item_type: itemType,
        user_id: user.uid,
        created_at: Timestamp.now(), // Use Firestore server timestamp
      });

      Alert.alert('Success', 'Your item has been posted!');
      // Clear form
      setTitle('');
      setDescription('');
      setLocation('');
      setItemType('lost');
      // Navigate to feed
      navigation.navigate('Feed');
    } catch (error: any) {
      console.error('Error posting item: ', error);
      Alert.alert('Error posting item', error.message);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.postContainer}>
        <Text style={styles.headerTitle}>Post an Item</Text>

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              itemType === 'lost'
                ? styles.toggleActiveLost
                : styles.toggleInactive,
            ]}
            onPress={() => setItemType('lost')}
          >
            <Text
              style={[
                styles.toggleText,
                itemType === 'lost'
                  ? styles.toggleTextActive
                  : styles.toggleTextInactive,
              ]}
            >
              I Lost Something
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              itemType === 'found'
                ? styles.toggleActiveFound
                : styles.toggleInactive,
            ]}
            onPress={() => setItemType('found')}
          >
            <Text
              style={[
                styles.toggleText,
                itemType === 'found'
                  ? styles.toggleTextActive
                  : styles.toggleTextInactive,
              ]}
            >
              I Found Something
            </Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Item Title (e.g., 'Red Wallet')"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder="Description"
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <TextInput
          style={styles.input}
          placeholder="Location (e.g., 'Library, 2nd Floor')"
          value={location}
          onChangeText={setLocation}
        />
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonTextPrimary}>Submit Post</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const ProfileScreen = () => {
  const { user } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // Auth listener will navigate to login
    } catch (error: any) {
      console.error('Error signing out: ', error);
      Alert.alert('Error signing out', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.profileContainer}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <Ionicons name="person-circle-outline" size={100} color="#333" />
        <Text style={styles.profileEmail}>{user?.email}</Text>
        <TouchableOpacity
          style={[styles.button, styles.buttonDanger]}
          onPress={handleSignOut}
        >
          <Text style={styles.buttonTextPrimary}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// --- Navigation Stacks ---

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="SignUp" component={SignUpScreen} />
  </AuthStack.Navigator>
);

const AppTabs = createBottomTabNavigator<AppTabParamList>();
const AppNavigator = () => (
  <AppTabs.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: '#007BFF',
      tabBarInactiveTintColor: 'gray',
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: keyof typeof Ionicons.glyphMap = 'alert-circle';
        if (route.name === 'Feed') {
          iconName = focused ? 'list' : 'list-outline';
        } else if (route.name === 'Post') {
          iconName = focused ? 'add-circle' : 'add-circle-outline';
        } else if (route.name === 'Profile') {
          iconName = focused ? 'person' : 'person-outline';
        }
        return <Ionicons name={iconName} size={size} color={color} />;
      },
    })}
  >
    <AppTabs.Screen name="Feed" component={FeedScreen} />
    <AppTabs.Screen name="Post" component={PostScreen} />
    <AppTabs.Screen name="Profile" component={ProfileScreen} />
  </AppTabs.Navigator>
);

const RootStack = createNativeStackNavigator<RootStackParamList>();

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    // You can return a loading spinner here
    return (
      <View style={[styles.container, styles.loader]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <RootStack.Screen name="App" component={AppNavigator} />
      ) : (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
    </RootStack.Navigator>
  );
};

// --- Main App Component ---
export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppContent />
      </NavigationContainer>
    </AuthProvider>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f8',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authInner: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  authTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  inputMultiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  button: {
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonPrimary: {
    backgroundColor: '#007BFF',
  },
  buttonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
  },
  buttonTextSecondary: {
    color: '#007BFF',
    fontSize: 16,
  },
  buttonDanger: {
    backgroundColor: '#DC3545',
    marginTop: 20,
    width: '100%',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 10 : 20, // Adjust for platform
    paddingBottom: 10,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterActive: {
    backgroundColor: '#007BFF',
  },
  filterText: {
    color: '#555',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  list: {
    paddingHorizontal: 16,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  itemTypeBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  badgeLost: {
    backgroundColor: '#DC3545',
  },
  badgeFound: {
    backgroundColor: '#28A745',
  },
  itemTypeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    maxWidth: '80%',
  },
  itemDescription: {
    fontSize: 16,
    color: '#555',
    marginBottom: 12,
  },
  itemLocation: {
    fontSize: 14,
    color: '#777',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  itemDate: {
    fontSize: 12,
    color: '#999',
  },
  postContainer: {
    padding: 20,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  toggleActiveLost: {
    backgroundColor: '#DC3545',
    borderColor: '#DC3545',
  },
  toggleActiveFound: {
    backgroundColor: '#28A745',
    borderColor: '#28A745',
  },
  toggleInactive: {
    backgroundColor: '#f9f9f9',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleTextActive: {
    color: '#fff',
  },
  toggleTextInactive: {
    color: '#555',
  },
  profileContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  profileEmail: {
    fontSize: 18,
    color: '#555',
    marginVertical: 16,
  },
  emptyList: {
    marginTop: 50,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 16,
    color: '#888',
  },
});
