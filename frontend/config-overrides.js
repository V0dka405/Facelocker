const webpack = require('webpack');

module.exports = function override(config) {
    // 1. ตั้งค่า Fallback สำหรับ Module ที่หายไป
    const fallback = config.resolve.fallback || {};
    Object.assign(fallback, {
        "crypto": require.resolve("crypto-browserify"),
        "stream": require.resolve("stream-browserify"),
        "assert": require.resolve("assert"),
        "http": require.resolve("stream-http"),
        "https": require.resolve("https-browserify"),
        "os": require.resolve("os-browserify"),
        "url": require.resolve("url"),
        "buffer": require.resolve("buffer"),
        "fs": false,
        "path": false,
        "zlib": false,
        "net": false,
        "tls": false,
        "child_process": false
    });
    config.resolve.fallback = fallback;

    // 2. ตั้งค่า Plugins ให้มีตัวแปร Global (process, Buffer)
    config.plugins = (config.plugins || []).concat([
        new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: ['buffer', 'Buffer']
        })
    ]);

    // 3. ***จุดสำคัญที่แก้ Error ของคุณ*** (Alias)
    // บังคับชี้เป้าว่าถ้าหา 'process/browser' ให้ไปเอาไฟล์นี้มาใช้
    config.resolve.alias = {
        ...config.resolve.alias,
        "process/browser": require.resolve("process/browser")
    };

    // ปิด SourceMap เพื่อลด Warning สีเหลืองๆ
    config.ignoreWarnings = [/Failed to parse source map/];

    return config;
};