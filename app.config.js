module.exports = {
  expo: {
    name: "CONNECTX",
    slug: "my-chat-",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "dark",
    android: {
      package: "com.qasimshaikh.connectx"
    },
    plugins: [
      [
        "expo-build-properties",
        {
          "android": {
            "kotlinVersion": "1.9.25"
          }
        }
      ]
    ],
    extra: {
      eas: {
        projectId: "2d99662d-7edc-488b-a53a-1e5c680d1ec8"
      }
    }
  }
};
