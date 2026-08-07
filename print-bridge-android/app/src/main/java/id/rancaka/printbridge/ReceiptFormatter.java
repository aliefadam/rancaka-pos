package id.rancaka.printbridge;

import android.graphics.Bitmap;

import java.io.ByteArrayOutputStream;
import java.nio.charset.Charset;
import java.text.NumberFormat;
import java.util.Locale;

public class ReceiptFormatter {
    private final int width;
    private final ByteArrayOutputStream output = new ByteArrayOutputStream();
    private final Charset charset = Charset.forName("CP437");

    public ReceiptFormatter(int width) {
        this.width = width;
        command(0x1B, 0x40);
    }

    public void text(String value) {
        write(wrap(clean(value)));
    }

    public void center(String value) {
        String clean = clean(value);
        if (clean.length() >= width) {
            text(clean);
            return;
        }

        int padding = Math.max((width - clean.length()) / 2, 0);
        write(repeat(" ", padding) + clean + "\n");
    }

    public void leftRight(String left, String right) {
        left = clean(left);
        right = clean(right);

        int space = width - left.length() - right.length();
        if (space < 1) {
            text(left);
            write(right + "\n");
            return;
        }

        write(left + repeat(" ", space) + right + "\n");
    }

    public void hr() {
        write(repeat("-", width) + "\n");
    }

    public void bold(boolean enabled) {
        command(0x1B, 0x45, enabled ? 1 : 0);
    }

    public void image(Bitmap bitmap, int dotsWidth) {
        Bitmap scaled = scaleForPrint(bitmap, dotsWidth);
        int contentWidth = scaled.getWidth();
        int height = scaled.getHeight();
        int offsetX = Math.max(0, (dotsWidth - contentWidth) / 2);
        int bytesPerRow = (dotsWidth + 7) / 8;

        command(0x1D, 0x76, 0x30, 0x00);
        command(bytesPerRow & 0xFF, (bytesPerRow >> 8) & 0xFF);
        command(height & 0xFF, (height >> 8) & 0xFF);

        byte[] raster = new byte[bytesPerRow * height];
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < contentWidth; x++) {
                if (isDark(scaled.getPixel(x, y))) {
                    int px = x + offsetX;
                    raster[y * bytesPerRow + (px / 8)] |= (byte) (0x80 >> (px % 8));
                }
            }
        }
        output.write(raster, 0, raster.length);
        write("\n");
        scaled.recycle();
    }

    private Bitmap scaleForPrint(Bitmap bitmap, int dotsWidth) {
        float ratio = bitmap.getHeight() / (float) bitmap.getWidth();
        int targetWidth = dotsWidth;
        int targetHeight = Math.round(targetWidth * ratio);

        int maxHeight = dotsWidth;
        if (targetHeight > maxHeight) {
            targetHeight = maxHeight;
            targetWidth = Math.round(targetHeight / ratio);
        }

        return Bitmap.createScaledBitmap(bitmap, Math.max(1, targetWidth), Math.max(1, targetHeight), true);
    }

    private boolean isDark(int pixel) {
        int alpha = (pixel >> 24) & 0xFF;
        if (alpha < 128) {
            return false;
        }

        int r = (pixel >> 16) & 0xFF;
        int g = (pixel >> 8) & 0xFF;
        int b = pixel & 0xFF;
        int luminance = (int) (0.299 * r + 0.587 * g + 0.114 * b);
        return luminance < 200;
    }

    public void feed(int lines) {
        for (int i = 0; i < lines; i++) {
            write("\n");
        }
    }

    public void cut() {
        command(0x1D, 0x56, 0x42, 0x00);
    }

    public byte[] toBytes() {
        return output.toByteArray();
    }

    public static String money(double amount) {
        NumberFormat format = NumberFormat.getCurrencyInstance(new Locale("id", "ID"));
        format.setMaximumFractionDigits(0);
        return format.format(amount).replace("Rp", "Rp ").replace(",00", "");
    }

    private String wrap(String value) {
        StringBuilder builder = new StringBuilder();
        String remaining = value;
        while (remaining.length() > width) {
            builder.append(remaining, 0, width).append("\n");
            remaining = remaining.substring(width);
        }
        builder.append(remaining).append("\n");
        return builder.toString();
    }

    private String clean(String value) {
        if (value == null) {
            return "";
        }

        return value
            .replace("•", "-")
            .replace("–", "-")
            .replace("—", "-")
            .replace("\r", " ")
            .replace("\n", " ")
            .trim();
    }

    private String repeat(String value, int times) {
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < times; i++) {
            builder.append(value);
        }
        return builder.toString();
    }

    private void write(String value) {
        byte[] bytes = value.getBytes(charset);
        output.write(bytes, 0, bytes.length);
    }

    private void command(int... values) {
        for (int value : values) {
            output.write(value);
        }
    }
}
