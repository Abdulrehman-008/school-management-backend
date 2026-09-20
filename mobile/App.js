import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { loadSession } from './src/services/authStorage';

import LoginScreen from './LoginScreen';
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import TeacherDashboardScreen from './src/screens/TeacherDashboardScreen';
import ClassTeacherDashboardScreen from './src/screens/ClassTeacherDashboardScreen';
import ManageClassesScreen from './src/screens/ManageClassesScreen';
import ManageTeachersScreen from './src/screens/ManageTeachersScreen';
import ManageStudentsScreen from './src/screens/ManageStudentsScreen';
import EnterMarksScreen from './src/screens/EnterMarksScreen';
import ReportCardScreen from './src/screens/ReportCardScreen';
import ClassResultScreen from './src/screens/ClassResultScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';

const Stack = createStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState(null); // null = loading

  useEffect(() => {
    (async () => {
      const session = await loadSession();
      if (session?.user?.role === 'admin') {
        setInitialRoute('AdminDashboard');
      } else if (session?.user?.role === 'class_teacher') {
        setInitialRoute('ClassTeacherDashboard');
      } else if (session?.user?.role === 'teacher') {
        setInitialRoute('TeacherDashboard');
      } else {
        setInitialRoute('Login');
      }
    })();
  }, []);

  if (initialRoute === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
          <Stack.Screen name="TeacherDashboard" component={TeacherDashboardScreen} />
          <Stack.Screen name="ClassTeacherDashboard" component={ClassTeacherDashboardScreen} />
          <Stack.Screen name="ManageClasses" component={ManageClassesScreen} />
          <Stack.Screen name="ManageTeachers" component={ManageTeachersScreen} />
          <Stack.Screen name="ManageStudents" component={ManageStudentsScreen} />
          <Stack.Screen name="EnterMarks" component={EnterMarksScreen} />
          <Stack.Screen name="ReportCard" component={ReportCardScreen} />
          <Stack.Screen name="ClassResult" component={ClassResultScreen} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
