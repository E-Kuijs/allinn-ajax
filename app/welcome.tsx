import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";

import { Ajax } from "@/constants/theme";
import { useAppContext } from "@/src/core/app-context";
import {
  supabaseRuntimeDebug,
  testSupabaseConnection,
} from "@/src/core/supabaseClient";

type Mode = "landing" | "login" | "register";

export default function WelcomeScreen() {
  const { loading, session, signIn, signInWithGoogle, signUp, content } =
    useAppContext();

  const [mode, setMode] = useState<Mode>("landing");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPass, setShowLoginPass] = useState(false);

  const [regName, setRegName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPassword2, setRegPassword2] = useState("");
  const [showRegPass, setShowRegPass] = useState(false);
  const [showRegPass2, setShowRegPass2] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    console.log("[WELCOME] mounted");
    console.log("[SUPABASE DEBUG]", supabaseRuntimeDebug);

    const runTest = async () => {
      const result = await testSupabaseConnection();
      console.log("[SUPABASE TEST RESULT]", result);
    };

    void runTest();
  }, []);

  useEffect(() => {
    if (session) {
      router.replace("/(tabs)/welcome" as any);
    }
  }, [session]);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={Ajax.red} />
      </View>
    );
  }

  const onLogin = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      Alert.alert("Vul alles in", "E-mail en wachtwoord zijn verplicht.");
      return;
    }

    console.log("[LOGIN] start", loginEmail);

    setBusy(true);
    const result = await signIn({
      email: loginEmail,
      password: loginPassword,
    });
    setBusy(false);

    console.log("[LOGIN RESULT]", result);

    if (!result.ok) {
      Alert.alert(
        "Inloggen mislukt",
        result.message ?? "Controleer je gegevens.",
      );
      return;
    }

    router.replace("/(tabs)/welcome" as any);
  };

  const onGoogleLogin = async () => {
    setBusy(true);
    const result = await signInWithGoogle();
    setBusy(false);

    console.log("[GOOGLE LOGIN]", result);

    if (!result.ok) {
      Alert.alert("Google login mislukt", result.message ?? "Probeer opnieuw.");
    }
  };

  const onRegister = async () => {
    if (
      !regName.trim() ||
      !regUsername.trim() ||
      !regEmail.trim() ||
      !regPassword.trim()
    ) {
      Alert.alert("Vul alles in", "Alle velden zijn verplicht.");
      return;
    }

    if (regPassword !== regPassword2) {
      Alert.alert("Controle", "Wachtwoorden komen niet overeen.");
      return;
    }

    if (!agreed) {
      Alert.alert(
        "Akkoord vereist",
        "Je moet akkoord gaan met de gebruiksvoorwaarden.",
      );
      return;
    }

    setBusy(true);
    const result = await signUp({
      email: regEmail,
      password: regPassword,
      displayName: regName,
      username: regUsername.startsWith("@") ? regUsername : `@${regUsername}`,
      acceptedTermsVersion: content.termsVersion,
    });
    setBusy(false);

    console.log("[REGISTER RESULT]", result);

    if (!result.ok) {
      Alert.alert("Registratie mislukt", result.message ?? "Probeer opnieuw.");
      return;
    }

    Alert.alert ("Gelukt", result.message ?? "Account aangemaakt.", [
      { text: "OK", onPress: () => setMode("login") },
    ]);
  };

  const bannerSource = content.welcomeBannerUrl
    ? { uri: content.welcomeBannerUrl }
    : require("@/assets/images/logo-media.png");

  const cornerSource = content.welcomeCornerImageUrl
    ? { uri: content.welcomeCornerImageUrl }
    : require("@/assets/images/logo-ajax.png");

  if (mode === "landing") {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.hero}>
          <Image
            source={bannerSource}
            style={styles.banner}
            resizeMode="contain"
          />
          <Text style={styles.title}>{content.welcomeTitle}</Text>
          <Text style={styles.subtitle}>{content.welcomeText}</Text>
          <Image
            source={cornerSource}
            style={styles.cornerImage}
            resizeMode="cover"
          />
        </View>

        <TouchableOpacity
          style={styles.primary}
          onPress={() => setMode("login")}
        >
          <Text style={styles.primaryText}>Inloggen</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondary}
          onPress={() => setMode("register")}
        >
          <Text style={styles.secondaryText}>Registreren</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.formContent}>
        <Text style={styles.formTitle}>
          {mode === "login" ? "Inloggen" : "Registreren"}
        </Text>

        {mode === "register" ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Naam"
              placeholderTextColor="#9aa0a6"
              value={regName}
              onChangeText={setRegName}
              autoCapitalize="words"
            />

            <TextInput
              style={styles.input}
              placeholder="Gebruikersnaam"
              placeholderTextColor="#9aa0a6"
              value={regUsername}
              onChangeText={setRegUsername}
              autoCapitalize="none"
            />
          </>
        ) : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#9aa0a6"
          value={mode === "login" ? loginEmail : regEmail}
          onChangeText={mode === "login" ? setLoginEmail : setRegEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Wachtwoord"
          placeholderTextColor="#9aa0a6"
          secureTextEntry={mode === "login" ? !showLoginPass : !showRegPass}
          value={mode === "login" ? loginPassword : regPassword}
          onChangeText={mode === "login" ? setLoginPassword : setRegPassword}
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() =>
            mode === "login"
              ? setShowLoginPass((prev) => !prev)
              : setShowRegPass((prev) => !prev)
          }
        >
          <Text style={styles.linkText}>
            {mode === "login"
              ? showLoginPass
                ? "Wachtwoord verbergen"
                : "Wachtwoord tonen"
              : showRegPass
                ? "Wachtwoord verbergen"
                : "Wachtwoord tonen"}
          </Text>
        </TouchableOpacity>

        {mode === "register" ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Herhaal wachtwoord"
              placeholderTextColor="#9aa0a6"
              secureTextEntry={!showRegPass2}
              value={regPassword2}
              onChangeText={setRegPassword2}
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => setShowRegPass2((prev) => !prev)}
            >
              <Text style={styles.linkText}>
                {showRegPass2
                  ? "Herhaal-wachtwoord verbergen"
                  : "Herhaal-wachtwoord tonen"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => setAgreed((prev) => !prev)}
            >
              <View
                style={[styles.checkBox, agreed ? styles.checkBoxActive : null]}
              />
              <Text style={styles.termsText}>
                Ik ga akkoord met de gebruiksvoorwaarden
              </Text>
            </TouchableOpacity>
          </>
        ) : null}

        <TouchableOpacity
          style={[styles.primary, busy ? styles.buttonDisabled : null]}
          onPress={mode === "login" ? onLogin : onRegister}
          disabled={busy}
        >
          <Text style={styles.primaryText}>
            {busy
              ? "Even geduld..."
              : mode === "login"
                ? "Inloggen"
                : "Registreren"}
          </Text>
        </TouchableOpacity>

        {mode === "login" ? (
          <TouchableOpacity
            style={[styles.secondary, busy ? styles.buttonDisabled : null]}
            onPress={onGoogleLogin}
            disabled={busy}
          >
            <Text style={styles.secondaryText}>Verder met Google</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => setMode(mode === "login" ? "register" : "login")}
        >
          <Text style={styles.linkText}>
            {mode === "login"
              ? "Nog geen account? Registreer"
              : "Al een account? Log in"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => setMode("landing")}
        >
          <Text style={styles.linkText}>Terug naar start</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1, backgroundColor: "#000" },
  content: { padding: 20 },
  hero: { marginBottom: 20 },
  banner: { width: "100%", height: 120 },
  title: { color: "#fff", fontSize: 22 },
  subtitle: { color: "#ccc" },
  cornerImage: { width: 60, height: 60 },
  primary: { backgroundColor: Ajax.red, padding: 15, marginTop: 10 },
  primaryText: { color: "#fff", textAlign: "center" },
  secondary: { borderWidth: 1, padding: 15, marginTop: 10 },
  secondaryText: { color: "#fff", textAlign: "center" },
  formContent: { padding: 20 },
  formTitle: { color: "#fff", fontSize: 20, marginBottom: 10 },
  buttonDisabled: { opacity: 0.6 },
  input: {
    backgroundColor: "#222",
    color: "#fff",
    marginBottom: 10,
    padding: 10,
  },
  linkButton: { marginTop: 8 },
  linkText: { color: "#fff", textAlign: "center" },
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  checkBox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: "#fff",
    marginRight: 10,
    backgroundColor: "transparent",
  },
  checkBoxActive: { backgroundColor: Ajax.red, borderColor: Ajax.red },
  termsText: { color: "#fff", flex: 1 },
});
