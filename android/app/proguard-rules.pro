# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keepattributes *Annotation*

# Mantener anotaciones de plugins (críticas para permisos)
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.annotation.Permission <fields>;
    @com.getcapacitor.annotation.PermissionCallback <methods>;
}

# Mantener plugins oficiales de Capacitor
-keep class com.capacitorjs.plugins.** { *; }

# (Opcional) Mantener tu plugin de ajustes nativos si lo usas
-keep class com.**.capacitornativesettings.** { *; }
-keep class **.capacitornativesettings.** { *; }
