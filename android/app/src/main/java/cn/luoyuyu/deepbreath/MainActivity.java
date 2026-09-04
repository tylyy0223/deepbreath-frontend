package cn.luoyuyu.deepbreath;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebView;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {

    private static final int MIC_PERMISSION_REQUEST = 1001;

    @Override
    public void onStart() {
        super.onStart();
        // 请求运行时麦克风权限（Android 6.0+ 需要动态授权）
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                    this,
                    new String[]{Manifest.permission.RECORD_AUDIO},
                    MIC_PERMISSION_REQUEST);
        }
    }

    @Override
    protected void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 继承 BridgeWebChromeClient（保留 Capacitor 内置的文件选择器 onShowFileChooser），
        // 同时允许 WebView 使用麦克风（getUserMedia）。
        // 注意：不能直接用匿名 WebChromeClient 覆盖，否则<input type=file>无法弹出文件选择。
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            getBridge().getWebView().setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
                @Override
                public void onPermissionRequest(PermissionRequest request) {
                    // 允许音频/麦克风权限请求
                    request.grant(request.getResources());
                }
            });
        }
    }
}
