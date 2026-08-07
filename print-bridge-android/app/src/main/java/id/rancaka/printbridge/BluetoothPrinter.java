package id.rancaka.printbridge;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;

import java.io.OutputStream;
import java.lang.reflect.Method;
import java.util.UUID;

public class BluetoothPrinter {
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    public static void print(String macAddress, byte[] data) throws Exception {
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null) {
            throw new IllegalStateException("Bluetooth tidak tersedia.");
        }

        BluetoothDevice device = adapter.getRemoteDevice(macAddress);
        adapter.cancelDiscovery();

        BluetoothSocket socket = connect(device);

        try {
            OutputStream output = socket.getOutputStream();
            output.write(data);
            output.flush();
            Thread.sleep(300);
        } finally {
            socket.close();
        }
    }

    private static BluetoothSocket connect(BluetoothDevice device) throws Exception {
        Exception lastException = null;

        for (int mode = 0; mode < 3; mode++) {
            BluetoothSocket socket = null;

            try {
                socket = createSocket(device, mode);
                socket.connect();
                return socket;
            } catch (Exception exception) {
                lastException = exception;

                if (socket != null) {
                    try {
                        socket.close();
                    } catch (Exception ignored) {
                        // Ignore close failure while trying the next connection mode.
                    }
                }

                Thread.sleep(300);
            }
        }

        throw lastException == null
            ? new IllegalStateException("Tidak bisa konek ke printer.")
            : lastException;
    }

    private static BluetoothSocket createSocket(BluetoothDevice device, int mode) throws Exception {
        if (mode == 0) {
            return device.createRfcommSocketToServiceRecord(SPP_UUID);
        }

        if (mode == 1) {
            return device.createInsecureRfcommSocketToServiceRecord(SPP_UUID);
        }

        Method method = device.getClass().getMethod("createRfcommSocket", int.class);
        return (BluetoothSocket) method.invoke(device, 1);
    }
}
