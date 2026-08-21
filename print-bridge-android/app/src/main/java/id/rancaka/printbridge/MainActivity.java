package id.rancaka.printbridge;

import android.Manifest;
import android.animation.ObjectAnimator;
import android.animation.ValueAnimator;
import android.app.Activity;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.BufferedInputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

public class MainActivity extends Activity {
    private static final int REQUEST_BLUETOOTH = 1201;
    private static final int COLOR_PRIMARY = 0xFF2563eb;
    private static final int COLOR_SUCCESS = 0xFF10b981;
    private static final int COLOR_WARNING = 0xFFf59e0b;
    private static final int COLOR_BG = 0xFFf8fafc;
    private static final int COLOR_CARD = 0xFFffffff;
    private static final int COLOR_TEXT = 0xFF1e293b;
    private static final int COLOR_TEXT_SECONDARY = 0xFF64748b;
    private static final int COLOR_BORDER = 0xFFe2e8f0;

    private final List<BluetoothDevice> pairedDevices = new ArrayList<>();
    private ArrayAdapter<String> deviceAdapter;
    private SharedPreferences preferences;

    private LinearLayout deviceListContainer;
    private TextView savedPrinterText;
    private TextView statusText;
    private TextView subtitleText;
    private TextView printProgressTitle;
    private TextView printProgressSubtitle;
    private Button saveButton;
    private Button testButton;
    private Button printSettingsButton;
    private ProgressBar loadingIndicator;
    private LinearLayout contentArea;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        preferences = getSharedPreferences("rancaka-print", MODE_PRIVATE);

        Intent intent = getIntent();
        if (isPrintRequest(intent) && hasDefaultPrinter()) {
            buildPrintProgressLayout();
            handlePrintIntentFromWeb(intent);
        } else {
            buildModernLayout();
            ensureBluetoothPermission();
            refreshPrinters();
            handlePrintIntentFromWeb(intent);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (isPrintRequest(intent) && hasDefaultPrinter()) {
            buildPrintProgressLayout();
        }
        handlePrintIntentFromWeb(intent);
    }

    private boolean isPrintRequest(Intent intent) {
        if (intent == null || intent.getData() == null) return false;
        Uri uri = intent.getData();
        return "rancaka-print".equals(uri.getScheme()) && "print".equals(uri.getHost());
    }

    private boolean hasDefaultPrinter() {
        return !preferences.getString("printer_mac", "").trim().isEmpty();
    }

    private void buildModernLayout() {
        // Root scrollable container
        ScrollView scrollView = new ScrollView(this);
        scrollView.setFillViewport(true);
        scrollView.setBackgroundColor(COLOR_BG);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(20), dp(24), dp(20), dp(32));

        // ===== HEADER =====
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setPadding(0, 0, 0, dp(24));

        // Logo area
        LinearLayout logoArea = new LinearLayout(this);
        logoArea.setOrientation(LinearLayout.VERTICAL);

        TextView logoIcon = new TextView(this);
        logoIcon.setText("🖨️");
        logoIcon.setTextSize(28);
        logoIcon.setPadding(0, 0, 0, 0);

        LinearLayout logoText = new LinearLayout(this);
        logoText.setOrientation(LinearLayout.VERTICAL);

        TextView title = new TextView(this);
        title.setText("Rancaka Print");
        title.setTextSize(22);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setTextColor(COLOR_TEXT);

        TextView subtitle = new TextView(this);
        subtitle.setText("Hubungkan printer thermal Bluetooth");
        subtitle.setTextSize(13);
        subtitle.setTextColor(COLOR_TEXT_SECONDARY);

        logoText.addView(title);
        logoText.addView(subtitle);
        logoArea.addView(logoIcon);
        logoArea.addView(logoText);

        header.addView(logoArea, linearParams(matchParent(), wrapContent(), 0, 0, 0, 0));

        // ===== SAVED PRINTER CARD =====
        LinearLayout savedPrinterCard = makeCard();
        savedPrinterCard.setPadding(dp(20), dp(20), dp(20), dp(16));
        savedPrinterCard.setOrientation(LinearLayout.VERTICAL);

        LinearLayout savedHeader = new LinearLayout(this);
        savedHeader.setOrientation(LinearLayout.HORIZONTAL);
        savedHeader.setGravity(Gravity.CENTER_VERTICAL);

        TextView savedIcon = new TextView(this);
        savedIcon.setText("✓");
        savedIcon.setTextSize(14);
        savedIcon.setBackgroundColor(COLOR_SUCCESS);
        savedIcon.setTextColor(0xFFFFFFFF);
        savedIcon.setGravity(Gravity.CENTER);
        savedIcon.setPadding(dp(8), dp(4), dp(8), dp(4));
        savedIcon.setBackground(ovalBackground(COLOR_SUCCESS));

        TextView savedLabel = new TextView(this);
        savedLabel.setText("Printer Default");
        savedLabel.setTextSize(12);
        savedLabel.setTextColor(COLOR_TEXT_SECONDARY);
        savedLabel.setPadding(dp(10), 0, 0, 0);

        savedHeader.addView(savedIcon);
        savedHeader.addView(savedLabel);

        savedPrinterText = new TextView(this);
        savedPrinterText.setText("Belum dipilih");
        savedPrinterText.setTextSize(16);
        savedPrinterText.setTypeface(Typeface.DEFAULT_BOLD);
        savedPrinterText.setTextColor(COLOR_TEXT);
        savedPrinterText.setPadding(0, dp(8), 0, 0);

        savedPrinterCard.addView(savedHeader);
        savedPrinterCard.addView(savedPrinterText);

        // ===== STATUS MESSAGE =====
        subtitleText = new TextView(this);
        subtitleText.setText("Pilih printer Bluetooth yang sudah di-pair dari Settings Android.");
        subtitleText.setTextSize(13);
        subtitleText.setTextColor(COLOR_TEXT_SECONDARY);
        subtitleText.setPadding(0, dp(16), 0, dp(20));

        // ===== DEVICE LIST SECTION =====
        TextView sectionTitle = new TextView(this);
        sectionTitle.setText("Printer Tersedia");
        sectionTitle.setTextSize(14);
        sectionTitle.setTypeface(Typeface.DEFAULT_BOLD);
        sectionTitle.setTextColor(COLOR_TEXT);
        sectionTitle.setPadding(0, 0, 0, dp(12));

        // Container for device list
        deviceListContainer = new LinearLayout(this);
        deviceListContainer.setOrientation(LinearLayout.VERTICAL);
        deviceListContainer.setPadding(0, 0, 0, dp(20));

        // ===== HELP TEXT =====
        LinearLayout helpCard = makeCard();
        helpCard.setPadding(dp(16), dp(14), dp(16), dp(14));
        helpCard.setBackgroundColor(0xFFeff6ff);

        TextView helpText = new TextView(this);
        helpText.setText("💡 Pastikan printer sudah di-pair dari Settings > Bluetooth sebelum refresh.");
        helpText.setTextSize(12);
        helpText.setTextColor(0xFF3b82f6);

        helpCard.addView(helpText);

        // ===== ACTION BUTTONS =====
        LinearLayout buttonGroup = new LinearLayout(this);
        buttonGroup.setOrientation(LinearLayout.VERTICAL);
        buttonGroup.setPadding(0, dp(8), 0, 0);

        Button refreshButton = makeButton("🔄 Refresh Printer", COLOR_CARD, COLOR_TEXT, true);
        refreshButton.setOnClickListener(v -> refreshPrinters());

        saveButton = makeButton("💾 Simpan Printer Default", COLOR_PRIMARY, 0xFFFFFFFF, false);
        saveButton.setOnClickListener(v -> saveSelectedPrinter());

        testButton = makeButton("🖨️ Test Print", COLOR_SUCCESS, 0xFFFFFFFF, false);
        testButton.setOnClickListener(v -> testPrint());

        buttonGroup.addView(refreshButton, linearParams(matchParent(), dp(48), 0, dp(8), 0, dp(8)));
        buttonGroup.addView(saveButton, linearParams(matchParent(), dp(48), 0, 0, 0, dp(8)));
        buttonGroup.addView(testButton, linearParams(matchParent(), dp(48), 0, 0, 0, 0));

        // ===== STATUS =====
        statusText = new TextView(this);
        statusText.setText("");
        statusText.setTextSize(13);
        statusText.setTextColor(COLOR_TEXT_SECONDARY);
        statusText.setPadding(0, dp(20), 0, 0);
        statusText.setGravity(Gravity.CENTER);

        // Loading indicator
        loadingIndicator = new ProgressBar(this);
        loadingIndicator.setVisibility(View.GONE);
        loadingIndicator.setIndeterminateTintList(android.content.res.ColorStateList.valueOf(COLOR_PRIMARY));

        // Assemble
        root.addView(header);
        root.addView(savedPrinterCard, linearParams(matchParent(), wrapContent(), 0, 0, 0, dp(16)));
        root.addView(subtitleText);
        root.addView(sectionTitle);
        root.addView(deviceListContainer);
        root.addView(helpCard, linearParams(matchParent(), wrapContent(), 0, 0, 0, dp(20)));
        root.addView(loadingIndicator, linearParams(matchParent(), dp(32), 0, 0, dp(16), 0));
        root.addView(buttonGroup);
        root.addView(statusText);

        scrollView.addView(root);
        setContentView(scrollView);
    }

    private void buildPrintProgressLayout() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setPadding(dp(24), dp(40), dp(24), dp(40));
        root.setBackgroundColor(COLOR_BG);

        // Main card
        LinearLayout card = makeCard();
        card.setGravity(Gravity.CENTER);
        card.setPadding(dp(32), dp(40), dp(32), dp(40));

        // Animated printer icon container
        LinearLayout iconContainer = new LinearLayout(this);
        iconContainer.setOrientation(LinearLayout.VERTICAL);
        iconContainer.setGravity(Gravity.CENTER);
        iconContainer.setPadding(dp(20), dp(20), dp(20), dp(20));

        // Background circle for icon
        android.graphics.drawable.GradientDrawable iconBg = new android.graphics.drawable.GradientDrawable();
        iconBg.setShape(android.graphics.drawable.GradientDrawable.OVAL);
        iconBg.setColor(0xFFdbeafe); // blue-100
        iconContainer.setBackground(iconBg);

        TextView printerIcon = new TextView(this);
        printerIcon.setText("🖨️");
        printerIcon.setTextSize(48);
        printerIcon.setGravity(Gravity.CENTER);

        iconContainer.addView(printerIcon);

        // Start pulse animation for icon container
        startPulseAnimation(iconContainer);

        // Progress indicator
        ProgressBar progress = new ProgressBar(this);
        progress.setIndeterminate(true);
        progress.setIndeterminateTintList(android.content.res.ColorStateList.valueOf(COLOR_PRIMARY));

        // Title
        printProgressTitle = new TextView(this);
        printProgressTitle.setText("Memproses Struk");
        printProgressTitle.setTextSize(22);
        printProgressTitle.setTypeface(Typeface.DEFAULT_BOLD);
        printProgressTitle.setTextColor(COLOR_TEXT);
        printProgressTitle.setGravity(Gravity.CENTER);
        printProgressTitle.setPadding(0, dp(24), 0, 0);

        // Subtitle
        printProgressSubtitle = new TextView(this);
        printProgressSubtitle.setText("Menyiapkan koneksi printer...");
        printProgressSubtitle.setTextSize(15);
        printProgressSubtitle.setTextColor(COLOR_TEXT_SECONDARY);
        printProgressSubtitle.setGravity(Gravity.CENTER);
        printProgressSubtitle.setPadding(0, dp(8), 0, 0);

        // Step indicators
        LinearLayout stepsContainer = new LinearLayout(this);
        stepsContainer.setOrientation(LinearLayout.HORIZONTAL);
        stepsContainer.setGravity(Gravity.CENTER);
        stepsContainer.setPadding(0, dp(24), 0, 0);

        // Step 1: Fetch
        LinearLayout step1 = makeStepIndicator("📥", "Ambil Data", true);

        // Connector
        TextView connector1 = new TextView(this);
        connector1.setText("━━");
        connector1.setTextColor(COLOR_BORDER);
        connector1.setPadding(dp(8), 0, dp(8), 0);

        // Step 2: Print
        LinearLayout step2 = makeStepIndicator("🖨️", "Cetak", false);

        // Connector
        TextView connector2 = new TextView(this);
        connector2.setText("━━");
        connector2.setTextColor(COLOR_BORDER);
        connector2.setPadding(dp(8), 0, dp(8), 0);

        // Step 3: Done
        LinearLayout step3 = makeStepIndicator("✓", "Selesai", false);

        stepsContainer.addView(step1);
        stepsContainer.addView(connector1);
        stepsContainer.addView(step2);
        stepsContainer.addView(connector2);
        stepsContainer.addView(step3);

        // Status text
        statusText = new TextView(this);
        statusText.setText("");
        statusText.setTextSize(13);
        statusText.setTextColor(COLOR_TEXT_SECONDARY);
        statusText.setGravity(Gravity.CENTER);
        statusText.setPadding(0, dp(20), 0, 0);

        // Help text
        TextView helpText = new TextView(this);
        helpText.setText("Mohon tunggu, jangan tutup aplikasi");
        helpText.setTextSize(12);
        helpText.setTextColor(0xFF94a3b8);
        helpText.setGravity(Gravity.CENTER);
        helpText.setPadding(0, dp(8), 0, 0);

        // Settings button (hidden by default)
        printSettingsButton = makeButton("⚙️ Buka Pengaturan Bluetooth", COLOR_CARD, COLOR_TEXT, true);
        printSettingsButton.setVisibility(View.GONE);
        printSettingsButton.setOnClickListener(v -> {
            startActivity(new Intent(Settings.ACTION_BLUETOOTH_SETTINGS));
        });

        // Assemble card
        card.addView(iconContainer, linearParams(dp(120), dp(120), 0, 0, 0, 0));
        card.addView(progress, linearParams(wrapContent(), wrapContent(), 0, dp(20), 0, 0));
        card.addView(printProgressTitle, linearParams(matchParent(), wrapContent(), 0, 0, 0, 0));
        card.addView(printProgressSubtitle, linearParams(matchParent(), wrapContent(), 0, 0, 0, 0));
        card.addView(stepsContainer, linearParams(matchParent(), wrapContent(), 0, 0, 0, 0));
        card.addView(statusText, linearParams(matchParent(), wrapContent(), 0, 0, 0, 0));
        card.addView(helpText, linearParams(matchParent(), wrapContent(), 0, 0, 0, 0));
        card.addView(printSettingsButton, linearParams(matchParent(), wrapContent(), 0, dp(20), 0, 0));

        root.addView(card, linearParams(matchParent(), wrapContent(), 0, 0, 0, 0));

        setContentView(root);
    }

    private LinearLayout makeStepIndicator(String icon, String label, boolean active) {
        LinearLayout step = new LinearLayout(this);
        step.setOrientation(LinearLayout.VERTICAL);
        step.setGravity(Gravity.CENTER);

        // Icon circle
        TextView iconView = new TextView(this);
        iconView.setText(icon);
        iconView.setTextSize(16);
        iconView.setGravity(Gravity.CENTER);
        iconView.setPadding(dp(8), dp(8), dp(8), dp(8));

        android.graphics.drawable.GradientDrawable circleBg = new android.graphics.drawable.GradientDrawable();
        circleBg.setShape(android.graphics.drawable.GradientDrawable.OVAL);
        circleBg.setColor(active ? COLOR_PRIMARY : 0xFFf1f5f9);
        iconView.setBackground(circleBg);

        // Label
        TextView labelView = new TextView(this);
        labelView.setText(label);
        labelView.setTextSize(10);
        labelView.setTextColor(active ? COLOR_PRIMARY : COLOR_TEXT_SECONDARY);
        labelView.setGravity(Gravity.CENTER);
        labelView.setPadding(0, dp(4), 0, 0);

        step.addView(iconView, linearParams(dp(40), dp(40), 0, 0, 0, 0));
        step.addView(labelView);

        return step;
    }

    private void startPulseAnimation(View view) {
        // Scale animation - pulse up and down
        ObjectAnimator scaleX = ObjectAnimator.ofFloat(view, "scaleX", 1f, 1.08f, 1f);
        ObjectAnimator scaleY = ObjectAnimator.ofFloat(view, "scaleY", 1f, 1.08f, 1f);

        scaleX.setDuration(1500);
        scaleX.setRepeatCount(ValueAnimator.INFINITE);
        scaleX.setRepeatMode(ValueAnimator.RESTART);
        scaleX.setInterpolator(new AccelerateDecelerateInterpolator());

        scaleY.setDuration(1500);
        scaleY.setRepeatCount(ValueAnimator.INFINITE);
        scaleY.setRepeatMode(ValueAnimator.RESTART);
        scaleY.setInterpolator(new AccelerateDecelerateInterpolator());

        scaleX.start();
        scaleY.start();

        // Alpha animation for the inner glow effect
        ObjectAnimator alphaAnim = ObjectAnimator.ofFloat(view, "alpha", 1f, 0.85f, 1f);
        alphaAnim.setDuration(1500);
        alphaAnim.setRepeatCount(ValueAnimator.INFINITE);
        alphaAnim.setRepeatMode(ValueAnimator.RESTART);
        alphaAnim.setInterpolator(new AccelerateDecelerateInterpolator());
        alphaAnim.start();
    }

    private LinearLayout makeCard() {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackgroundColor(COLOR_CARD);
        card.setPadding(dp(20), dp(16), dp(20), dp(16));

        // Card shadow simulation using border
        android.graphics.drawable.GradientDrawable bg = new android.graphics.drawable.GradientDrawable();
        bg.setCornerRadius(dp(16));
        bg.setColor(COLOR_CARD);
        bg.setStroke(0, 0);
        card.setBackground(bg);

        return card;
    }

    private android.graphics.drawable.ShapeDrawable ovalBackground(int color) {
        android.graphics.drawable.ShapeDrawable drawable = new android.graphics.drawable.ShapeDrawable(
            new android.graphics.drawable.shapes.RoundRectShape(
                new float[]{dp(20), dp(20), dp(20), dp(20), dp(20), dp(20), dp(20), dp(20)},
                null, null
            )
        );
        drawable.getPaint().setColor(color);
        return drawable;
    }

    private Button makeButton(String text, int bgColor, int textColor, boolean isSecondary) {
        Button button = new Button(this);
        button.setText(text);
        button.setAllCaps(false);
        button.setTextSize(15);
        button.setTypeface(Typeface.DEFAULT, isSecondary ? Typeface.NORMAL : Typeface.BOLD);

        android.graphics.drawable.GradientDrawable bg = new android.graphics.drawable.GradientDrawable();
        bg.setCornerRadius(dp(14));
        bg.setColor(bgColor);
        if (isSecondary) {
            bg.setStroke(dp(1), COLOR_BORDER);
        }
        button.setBackground(bg);
        button.setTextColor(textColor);

        button.setPadding(dp(20), dp(14), dp(20), dp(14));
        return button;
    }

    private LinearLayout.LayoutParams linearParams(int width, int height, int left, int top, int right, int bottom) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(width, height);
        params.setMargins(left, top, right, bottom);
        return params;
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density);
    }

    private int matchParent() {
        return LinearLayout.LayoutParams.MATCH_PARENT;
    }

    private int wrapContent() {
        return LinearLayout.LayoutParams.WRAP_CONTENT;
    }

    private void ensureBluetoothPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
            checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_SCAN
            }, REQUEST_BLUETOOTH);
        }
    }

    private boolean canUseBluetooth() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
            checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED;
    }

    private void refreshPrinters() {
        if (!canUseBluetooth()) {
            setStatus("⚠️ Izinkan akses Bluetooth terlebih dahulu.");
            ensureBluetoothPermission();
            return;
        }

        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null) {
            setStatus("❌ Perangkat ini tidak mendukung Bluetooth.");
            return;
        }

        if (!adapter.isEnabled()) {
            startActivity(new Intent(Settings.ACTION_BLUETOOTH_SETTINGS));
            setStatus("🔵 Aktifkan Bluetooth, pair printer, lalu tekan Refresh.");
            return;
        }

        // Show loading
        loadingIndicator.setVisibility(View.VISIBLE);
        deviceListContainer.removeAllViews();
        pairedDevices.clear();

        Set<BluetoothDevice> bondedDevices = adapter.getBondedDevices();
        if (bondedDevices.isEmpty()) {
            loadingIndicator.setVisibility(View.GONE);
            TextView empty = new TextView(this);
            empty.setText("Belum ada printer ter-pair.\nPair printer dari Settings > Bluetooth terlebih dahulu.");
            empty.setTextSize(14);
            empty.setTextColor(COLOR_TEXT_SECONDARY);
            empty.setGravity(Gravity.CENTER);
            empty.setPadding(dp(20), dp(24), dp(20), dp(24));
            deviceListContainer.addView(empty);
            setStatus("ℹ️ Belum ada printer yang ter-pair.");
            return;
        }

        String savedMac = preferences.getString("printer_mac", "");
        int selectedIndex = -1;

        for (BluetoothDevice device : bondedDevices) {
            pairedDevices.add(device);
            String name = safeName(device);
            String address = device.getAddress();

            // Create device card
            LinearLayout deviceCard = new LinearLayout(this);
            deviceCard.setOrientation(LinearLayout.HORIZONTAL);
            deviceCard.setGravity(Gravity.CENTER_VERTICAL);
            deviceCard.setPadding(dp(16), dp(14), dp(16), dp(14));
            deviceCard.setBackgroundColor(deviceCard.getContext().getColor(android.R.color.transparent));

            android.graphics.drawable.GradientDrawable cardBg = new android.graphics.drawable.GradientDrawable();
            cardBg.setCornerRadius(dp(12));
            cardBg.setColor(0xFFf8fafc);
            cardBg.setStroke(savedMac.equals(address) ? dp(2) : 0, COLOR_PRIMARY);
            deviceCard.setBackground(cardBg);

            // Check icon
            TextView checkIcon = new TextView(this);
            checkIcon.setText(savedMac.equals(address) ? "✓" : "○");
            checkIcon.setTextSize(16);
            checkIcon.setTextColor(savedMac.equals(address) ? COLOR_PRIMARY : COLOR_BORDER);
            checkIcon.setPadding(0, 0, dp(12), 0);

            // Device info
            LinearLayout deviceInfo = new LinearLayout(this);
            deviceInfo.setOrientation(LinearLayout.VERTICAL);
            deviceInfo.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));

            TextView deviceName = new TextView(this);
            deviceName.setText(name);
            deviceName.setTextSize(15);
            deviceName.setTypeface(Typeface.DEFAULT_BOLD);
            deviceName.setTextColor(COLOR_TEXT);

            TextView deviceAddress = new TextView(this);
            deviceAddress.setText(address);
            deviceAddress.setTextSize(12);
            deviceAddress.setTextColor(COLOR_TEXT_SECONDARY);
            deviceAddress.setPadding(0, dp(2), 0, 0);

            deviceInfo.addView(deviceName);
            deviceInfo.addView(deviceAddress);

            // Radio indicator
            TextView radio = new TextView(this);
            radio.setText(savedMac.equals(address) ? "●" : "○");
            radio.setTextSize(20);
            radio.setTextColor(savedMac.equals(address) ? COLOR_PRIMARY : COLOR_BORDER);

            deviceCard.addView(checkIcon);
            deviceCard.addView(deviceInfo);
            deviceCard.addView(radio);

            final int index = pairedDevices.size() - 1;
            final String fmac = address;
            deviceCard.setOnClickListener(v -> selectPrinter(index));

            LinearLayout.LayoutParams cardParams = new LinearLayout.LayoutParams(matchParent(), wrapContent());
            cardParams.setMargins(0, 0, 0, dp(8));
            deviceListContainer.addView(deviceCard, cardParams);

            if (savedMac.equals(address)) {
                selectedIndex = pairedDevices.size() - 1;
            }
        }

        loadingIndicator.setVisibility(View.GONE);

        // Update saved printer text
        if (savedMac.isEmpty()) {
            savedPrinterText.setText("Belum dipilih - tap printer untuk memilih");
            savedPrinterText.setTextColor(COLOR_TEXT_SECONDARY);
            saveButton.setEnabled(false);
            testButton.setEnabled(false);
        } else {
            savedPrinterText.setText(safeName(bondedDevices.stream().filter(d -> d.getAddress().equals(savedMac)).findFirst().orElse(null)));
            savedPrinterText.setTextColor(COLOR_TEXT);
            saveButton.setEnabled(true);
            testButton.setEnabled(true);
        }

        setStatus("📱 Ditemukan " + pairedDevices.size() + " printer ter-pair");
    }

    private void selectPrinter(int index) {
        if (index < 0 || index >= pairedDevices.size()) return;

        BluetoothDevice device = pairedDevices.get(index);
        preferences.edit()
            .putString("printer_mac", device.getAddress())
            .putString("printer_name", safeName(device))
            .apply();

        savedPrinterText.setText(safeName(device));
        savedPrinterText.setTextColor(COLOR_TEXT);
        saveButton.setEnabled(true);
        testButton.setEnabled(true);
        setStatus("✓ Printer \"" + safeName(device) + "\" dipilih");

        // Refresh list to show selection
        refreshPrinters();
    }

    private String safeName(BluetoothDevice device) {
        if (device == null) return "Tidak diketahui";
        if (!canUseBluetooth()) return "Printer";
        String name = device.getName();
        return name == null || name.trim().isEmpty() ? "Bluetooth Printer" : name;
    }

    private void saveSelectedPrinter() {
        String savedMac = preferences.getString("printer_mac", "");
        if (savedMac.isEmpty()) {
            setStatus("⚠️ Pilih printer terlebih dahulu dengan mengetuk salah satu printer.");
            return;
        }

        String name = preferences.getString("printer_name", savedMac);
        savedPrinterText.setText(name);
        savedPrinterText.setTextColor(COLOR_TEXT);
        saveButton.setEnabled(true);
        testButton.setEnabled(true);
        setStatus("✅ Printer default tersimpan: " + name);
    }

    private void testPrint() {
        String mac = preferences.getString("printer_mac", "");
        if (mac.isEmpty()) {
            setStatus("⚠️ Pilih & simpan printer default terlebih dahulu.");
            return;
        }

        setStatus("🖨️ Mengirim test print...");
        runInBackground(() -> {
            try {
                ReceiptFormatter formatter = new ReceiptFormatter(32);
                formatter.center("━━━━━━━━━━━━━━━━");
                formatter.center("RANCAKA PRINT");
                formatter.center("━━━━━━━━━━━━━━━━");
                formatter.center("Test print berhasil!");
                formatter.center("");
                formatter.center("Tanggal: " + new java.text.SimpleDateFormat("dd/MM/yyyy HH:mm").format(new java.util.Date()));
                formatter.center("");
                formatter.center("Jika struk ini keluar,");
                formatter.center("maka printer siap digunakan!");
                formatter.center("");
                formatter.center("━━━━━━━━━━━━━━━━");
                formatter.feed(3);
                formatter.cut();
                BluetoothPrinter.print(mac, formatter.toBytes());
                runOnUi(() -> setStatus("✅ Test print terkirim! Periksa printer."));
            } catch (Exception e) {
                runOnUi(() -> setStatus("❌ Test print gagal: " + readableBluetoothError(e)));
            }
        });
    }

    private void handlePrintIntentFromWeb(Intent intent) {
        if (!isPrintRequest(intent)) return;

        Uri uri = intent.getData();
        String receiptUrl = uri.getQueryParameter("receipt_url");
        if (receiptUrl == null || receiptUrl.trim().isEmpty()) {
            setStatus("Link struk tidak ditemukan.");
            return;
        }

        String mac = preferences.getString("printer_mac", "");
        if (mac.trim().isEmpty()) {
            if (subtitleText != null) {
                subtitleText.setText("Pilih printer default terlebih dahulu, lalu ulangi cetak dari kasir.");
            }
            setStatus("Pilih printer default dulu dari aplikasi ini, baru proses cetak dari POS.");
            return;
        }

        updatePrintProgress("Memproses cetak struk", "Mengambil data struk...");
        setStatus("Mengambil data struk...");

        runInBackground(() -> {
            try {
                showPrintProgressState("Mengambil data struk...");
                String json = fetch(receiptUrl);
                byte[] payload = buildReceiptBytes(new JSONObject(json));
                showPrintProgressState("Mencetak struk...");
                BluetoothPrinter.print(mac, payload);
                showPrintSuccessAndClose();
            } catch (Exception e) {
                showPrintErrorState("Cetak gagal: " + readableBluetoothError(e));
            }
        });
    }

    private void showPrintProgressState(String message) {
        runOnUi(() -> {
            if (printSettingsButton != null) {
                printSettingsButton.setVisibility(View.GONE);
            }
            updatePrintProgress("Memproses cetak struk", message);
            setStatus(message);
        });
    }

    private void showPrintSuccessAndClose() {
        runOnUi(() -> {
            if (printSettingsButton != null) {
                printSettingsButton.setVisibility(View.GONE);
            }
            updatePrintProgress("Struk berhasil dicetak", "Akan kembali ke POS...");
            setStatus("Struk berhasil dicetak");
            new Handler(Looper.getMainLooper()).postDelayed(() -> finish(), 1500);
        });
    }

    private void showPrintErrorState(String message) {
        runOnUi(() -> {
            updatePrintProgress("Cetak gagal", "Periksa printer lalu coba lagi.");
            setStatus(message);
            if (printSettingsButton != null) {
                printSettingsButton.setVisibility(View.VISIBLE);
            }
        });
    }

    private void updatePrintProgress(String title, String subtitle) {
        if (printProgressTitle != null) {
            printProgressTitle.setText(title);
        }
        if (printProgressSubtitle != null) {
            printProgressSubtitle.setText(subtitle);
        }
        if (subtitleText != null) {
            subtitleText.setText(subtitle);
        }
    }

    private void handlePrintIntent(Intent intent) {
        if (intent == null || intent.getData() == null) return;

        Uri uri = intent.getData();
        if (!"rancaka-print".equals(uri.getScheme()) || !"print".equals(uri.getHost())) return;

        String receiptUrl = uri.getQueryParameter("receipt_url");
        if (receiptUrl == null || receiptUrl.trim().isEmpty()) {
            setStatus("⚠️ Link struk tidak ditemukan.");
            return;
        }

        String mac = preferences.getString("printer_mac", "");
        if (mac.isEmpty()) {
            setStatus("⚠️ Set printer default dulu dari aplikasi ini, baru proses cetak dari POS.");
            return;
        }

        runOnUi(() -> {
            subtitleText.setText("⏳ Memproses struk... Jangan tutup aplikasi.");
            setStatus("🖨️ Mengambil data struk...");
        });

        runInBackground(() -> {
            try {
                showPrintingState("⏳ Mengambil data struk...");
                String json = fetch(receiptUrl);
                byte[] payload = buildReceiptBytes(new JSONObject(json));
                showPrintingState("🖨️ Mencetak struk...");
                BluetoothPrinter.print(mac, payload);
                showSuccessAndClose("✅ Struk berhasil dicetak!");
            } catch (Exception e) {
                runOnUi(() -> {
                    subtitleText.setText("Gagal mencetak. Pastikan printer nyala & terhubung.");
                    setStatus("❌ Cetak gagal: " + readableBluetoothError(e));
                });
            }
        });
    }

    private void showPrintingState(String message) {
        runOnUi(() -> {
            subtitleText.setText(message);
            setStatus(message);
        });
    }

    private void showSuccessAndClose(String message) {
        runOnUi(() -> {
            subtitleText.setText(message + "\nAkan kembali ke POS...");
            setStatus(message);
            new Handler(Looper.getMainLooper()).postDelayed(() -> finish(), 1500);
        });
    }

    private String fetch(String receiptUrl) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(receiptUrl).openConnection();
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(15000);
        connection.setRequestMethod("GET");
        connection.setRequestProperty("Accept", "application/json");

        int code = connection.getResponseCode();
        BufferedInputStream input = new BufferedInputStream(
            code >= 200 && code < 300 ? connection.getInputStream() : connection.getErrorStream()
        );

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[4096];
        int read;
        while ((read = input.read(buffer)) != -1) {
            output.write(buffer, 0, read);
        }

        String body = output.toString("UTF-8");
        if (code < 200 || code >= 300) {
            throw new Exception("Server mengembalikan HTTP " + code + ": " + body);
        }
        return body;
    }

    private Bitmap fetchLogo(String logoUrl) {
        try {
            HttpURLConnection connection = (HttpURLConnection) new URL(logoUrl).openConnection();
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(15000);
            connection.setRequestMethod("GET");

            int code = connection.getResponseCode();
            if (code < 200 || code >= 300) {
                return null;
            }

            BufferedInputStream input = new BufferedInputStream(connection.getInputStream());
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            byte[] buffer = new byte[4096];
            int read;
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
            }

            byte[] bytes = output.toByteArray();
            return BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        } catch (Exception exception) {
            return null;
        }
    }

    private byte[] buildReceiptBytes(JSONObject payload) throws Exception {
        JSONObject store = payload.optJSONObject("store");
        JSONObject sale = payload.getJSONObject("sale");
        JSONArray items = sale.optJSONArray("items");
        if (items == null) items = new JSONArray();
        JSONObject payment = sale.optJSONObject("payment");
        JSONObject membershipPoints = sale.optJSONObject("membership_points");
        String receiptSize = store == null ? "58mm" : store.optString("receipt_size", "58mm");
        int charWidth = "80mm".equals(receiptSize) ? 48 : 32;
        ReceiptFormatter formatter = new ReceiptFormatter(charWidth);

        String logoUrl = store == null ? null : store.optString("logo_url", "");
        if (logoUrl != null && !logoUrl.isEmpty()) {
            Bitmap logo = fetchLogo(logoUrl);
            if (logo != null) {
                formatter.image(logo, charWidth * 12);
                logo.recycle();
            }
        }

        formatter.center(store == null ? "Rancaka" : store.optString("name", "Rancaka"));
        if (store != null && !store.optString("address", "").isEmpty()) {
            formatter.center(store.optString("address"));
        }
        if (store != null && !store.optString("phone", "").isEmpty()) {
            formatter.center(store.optString("phone"));
        }
        formatter.hr();
        formatter.leftRight("No", sale.optString("invoice_number", "-"));
        formatter.leftRight("Tanggal", sale.optString("sold_at", "-"));
        formatter.leftRight("Kasir", sale.optString("cashier", "-"));
        formatter.hr();

        if ("credit_payment".equals(sale.optString("receipt_type", ""))) {
            formatter.bold(true);
            formatter.center("BUKTI PEMBAYARAN HUTANG");
            formatter.bold(false);
            formatter.center(sale.optString("payment_number", "-"));
            formatter.hr();
            formatter.leftRight("Pelanggan", sale.optString("customer", "-"));
            formatter.leftRight("Total hutang", ReceiptFormatter.money(sale.optDouble("total_credit", 0)));
            formatter.leftRight("Sisa sebelumnya", ReceiptFormatter.money(sale.optDouble("remaining_before", 0)));
            formatter.bold(true);
            formatter.leftRight("Pembayaran", "-" + ReceiptFormatter.money(sale.optDouble("payment_amount", 0)));
            formatter.leftRight("Sisa hutang", ReceiptFormatter.money(sale.optDouble("remaining_after", 0)));
            formatter.bold(false);
            formatter.leftRight("Status", sale.optBoolean("is_paid", false) ? "LUNAS" : "BELUM LUNAS");
            if (!sale.optString("note", "").isEmpty()) {
                formatter.text("Catatan: " + sale.optString("note"));
            }
            formatter.hr();
            String creditFooter = store == null ? "" : store.optString("receipt_footer", "");
            formatter.center(creditFooter.isEmpty() ? "Terima kasih" : creditFooter);
            formatter.center("Simpan sebagai bukti pembayaran");
            formatter.feed(3);
            formatter.cut();
            return formatter.toBytes();
        }

        if (sale.optBoolean("is_void", false) || "void".equalsIgnoreCase(sale.optString("status", ""))) {
            formatter.bold(true);
            formatter.center("TRANSAKSI VOID");
            formatter.bold(false);
            if (!sale.optString("voided_at", "").isEmpty()) {
                formatter.leftRight("Di-void", sale.optString("voided_at", "-"));
            }
            if (!sale.optString("voided_by", "").isEmpty()) {
                formatter.leftRight("Oleh", sale.optString("voided_by", "-"));
            }
            if (!sale.optString("void_reason", "").isEmpty()) {
                formatter.text("Alasan: " + sale.optString("void_reason", "-"));
            }
            formatter.hr();
        }

        for (int i = 0; i < items.length(); i++) {
            JSONObject item = items.getJSONObject(i);
            formatter.text(item.optString("name", "-"));
            formatter.leftRight(
                item.optInt("quantity", 0) + " x " + ReceiptFormatter.money(item.optDouble("unit_price", 0)),
                ReceiptFormatter.money(item.optDouble("line_total", 0))
            );
            double discount = item.optDouble("discount_amount", 0);
            if (discount > 0) {
                formatter.leftRight("Diskon", "-" + ReceiptFormatter.money(discount));
            }
        }

        formatter.hr();
        formatter.leftRight("Subtotal", ReceiptFormatter.money(sale.optDouble("subtotal", 0)));
        formatter.leftRight("Diskon", ReceiptFormatter.money(sale.optDouble("discount_total", 0)));
        if (sale.optDouble("tax_total", 0) > 0) {
            formatter.leftRight("Pajak", ReceiptFormatter.money(sale.optDouble("tax_total", 0)));
        }
        if (sale.optDouble("service_charge_total", 0) > 0) {
            formatter.leftRight("Biaya layanan", ReceiptFormatter.money(sale.optDouble("service_charge_total", 0)));
        }
        if (sale.optDouble("additional_fee", 0) > 0) {
            formatter.leftRight("Biaya tambahan", ReceiptFormatter.money(sale.optDouble("additional_fee", 0)));
        }
        formatter.bold(true);
        formatter.leftRight("Total", ReceiptFormatter.money(sale.optDouble("grand_total", 0)));
        formatter.bold(false);

        if (payment != null) {
            formatter.hr();
            String paymentMethod = payment.optString("method", "-");
            formatter.leftRight("Metode", paymentMethod.toUpperCase());
            if ("credit".equalsIgnoreCase(paymentMethod)) {
                if (!payment.optString("credit_customer", "").isEmpty()) {
                    formatter.leftRight("Pelanggan", payment.optString("credit_customer", "-"));
                }
                formatter.leftRight("Sudah dibayar", ReceiptFormatter.money(payment.optDouble("paid_amount", 0)));
                formatter.bold(true);
                formatter.leftRight("Sisa hutang", ReceiptFormatter.money(payment.optDouble("remaining_amount", 0)));
                formatter.bold(false);
            } else {
                formatter.leftRight("Bayar", ReceiptFormatter.money(payment.optDouble("paid_amount", payment.optDouble("amount", 0))));
                formatter.leftRight("Kembali", ReceiptFormatter.money(payment.optDouble("change_amount", 0)));
            }
        }

        if (membershipPoints != null) {
            formatter.hr();
            formatter.text("Poin Membership");
            formatter.leftRight("Poin Sebelum", String.valueOf(membershipPoints.optInt("before", 0)));
            if (membershipPoints.optInt("used", 0) > 0) {
                formatter.leftRight("Poin Dipakai", "-" + membershipPoints.optInt("used", 0));
            }
            formatter.leftRight("Poin Didapat", "+" + membershipPoints.optInt("earned", 0));
            formatter.leftRight("Poin Sesudah", String.valueOf(membershipPoints.optInt("after", 0)));
        }

        formatter.hr();
        String receiptFooter = store == null ? "" : store.optString("receipt_footer", "");
        formatter.center(receiptFooter.isEmpty() ? "Terima kasih" : receiptFooter);
        formatter.center("Selamat datang kembali");
        formatter.feed(3);
        formatter.cut();

        return formatter.toBytes();
    }

    private void runInBackground(Runnable task) {
        new Thread(task).start();
    }

    private void runOnUi(Runnable task) {
        runOnUiThread(task);
    }

    private void setStatus(String message) {
        runOnUi(() -> statusText.setText(message));
    }

    private String readableBluetoothError(Exception exception) {
        String message = exception.getMessage() == null ? exception.toString() : exception.getMessage();
        if (message.contains("read failed") || message.contains("socket might closed")) {
            return "Printer tidak merespon. Matikan/nyalakan printer, unpair & pair ulang, lalu coba lagi.";
        }
        return message;
    }
}
