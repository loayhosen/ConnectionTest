document.addEventListener('DOMContentLoaded', function() {
    // Set current year in footer
    document.getElementById('year').textContent = new Date().getFullYear();
    
    // Disable Chart.js source maps to avoid errors
    Chart.defaults.plugins.legend.display = false;
    Chart.defaults.plugins.tooltip.enabled = false;
    
    // Language support
    const translations = {
        'en': {
            'title': 'Internet Speed Test',
            'subtitle': 'Measure your internet connection speed accurately and easily',
            'startTest': 'Start Test',
            'ready': 'Ready to start',
            'download': 'Download Speed',
            'upload': 'Upload Speed',
            'ping': 'Ping',
            'isp': 'ISP:',
            'location': 'Location:',
            'server': 'Test Server:',
            'testDate': 'Test Date:',
            'shareTwitter': 'Twitter',
            'shareFacebook': 'Facebook',
            'copyLink': 'Copy Link',
            'historyTitle': 'Previous Tests',
            'date': 'Date',
            'copyright': 'All rights reserved &copy; ',
            'testingDownload': 'Testing download speed...',
            'testingUpload': 'Testing upload speed...',
            'testingPing': 'Testing ping...',
            'testComplete': 'Test completed!',
            'copySuccess': 'Link copied to clipboard!',
            'copyError': 'Failed to copy link',
            'unknown': 'Unknown',
            'noHistory': 'No test history available'
        },
        'ar': {
            'title': 'اختبار سرعة الإنترنت',
            'subtitle': 'قم بقياس سرعة اتصالك بالإنترنت بدقة وسهولة',
            'startTest': 'بدء الاختبار',
            'ready': 'جاهز للبدء',
            'download': 'سرعة التنزيل',
            'upload': 'سرعة الرفع',
            'ping': 'زمن الاستجابة',
            'isp': 'مزود الخدمة (ISP):',
            'location': 'الموقع:',
            'server': 'خادم الاختبار:',
            'testDate': 'تاريخ الاختبار:',
            'shareTwitter': 'تويتر',
            'shareFacebook': 'فيسبوك',
            'copyLink': 'نسخ الرابط',
            'historyTitle': 'الاختبارات السابقة',
            'date': 'التاريخ',
            'copyright': 'جميع الحقوق محفوظة &copy; ',
            'testingDownload': 'جاري قياس سرعة التنزيل...',
            'testingUpload': 'جاري قياس سرعة الرفع...',
            'testingPing': 'جاري قياس زمن الاستجابة...',
            'testComplete': 'تم الانتهاء من الاختبار!',
            'copySuccess': 'تم نسخ الرابط إلى الحافظة!',
            'copyError': 'فشل نسخ الرابط',
            'unknown': 'غير معروف',
            'noHistory': 'لا توجد اختبارات سابقة'
        }
    };
    
    let currentLang = navigator.language.startsWith('ar') ? 'ar' : 'en';
    let currentUnit = 'mbps';
    let testHistory = JSON.parse(localStorage.getItem('speedTestHistory')) || [];
    
    // Original test results storage (in Mbps)
    let originalResults = {
        download: 0, // in Mbps
        upload: 0,   // in Mbps
        ping: 0      // in ms
    };
    
    // Initialize language
    function setLanguage(lang) {
        currentLang = lang;
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        
        // Update active language button
        document.getElementById('langAr').classList.toggle('active', lang === 'ar');
        document.getElementById('langEn').classList.toggle('active', lang === 'en');
        
        // Update all translatable elements
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[lang][key]) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.value = translations[lang][key];
                } else {
                    el.textContent = translations[lang][key];
                }
            }
        });
        
        // Update history table
        renderHistory();
    }
    
    // Language switcher
    document.getElementById('langAr').addEventListener('click', () => setLanguage('ar'));
    document.getElementById('langEn').addEventListener('click', () => setLanguage('en'));
    
    // Unit switcher
    document.querySelectorAll('.unit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.unit-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentUnit = this.getAttribute('data-unit');
            updateDisplayedUnits();
        });
    });
    
    // Convert speed based on current unit
    function convertSpeed(value) {
        switch(currentUnit) {
            case 'mbps': return value; // Keep as Mbps
            case 'kbps': return value * 1000; // Convert to Kbps
            case 'mb': return value / 8; // Convert to MB/s
            case 'kb': return value * 1000 / 8; // Convert to KB/s
            default: return value;
        }
    }
    
    // Format speed with proper decimals
    function formatSpeed(value) {
        const converted = convertSpeed(value);
        return converted.toFixed(currentUnit === 'mbps' || currentUnit === 'kbps' ? 2 : 3);
    }
    
    // Update all displayed units
    function updateDisplayedUnits() {
        const unitText = {
            'mbps': 'Mbps',
            'kbps': 'Kbps',
            'mb': 'MB/s',
            'kb': 'KB/s'
        };
        
        // Update download speed display
        document.getElementById('downloadValue').innerHTML = 
            `${formatSpeed(originalResults.download)} <span class="gauge-unit">${unitText[currentUnit]}</span>`;
        
        // Update upload speed display
        document.getElementById('uploadValue').innerHTML = 
            `${formatSpeed(originalResults.upload)} <span class="gauge-unit">${unitText[currentUnit]}</span>`;
        
        // Update ping display (doesn't change)
        document.getElementById('pingValue').innerHTML = 
            `${originalResults.ping.toFixed(0)} <span class="gauge-unit">ms</span>`;
        
        // Update gauges
        updateGauge(downloadGauge, originalResults.download, 100);
        updateGauge(uploadGauge, originalResults.upload, 50);
        
        // Update history
        renderHistory();
    }
    
    // Initialize gauges
    const downloadCtx = document.getElementById('downloadCanvas').getContext('2d');
    const uploadCtx = document.getElementById('uploadCanvas').getContext('2d');
    const pingCtx = document.getElementById('pingCanvas').getContext('2d');
    
    const gaugeOptions = {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [0, 100],
                backgroundColor: ['#4361ee', '#e9ecef'],
                borderWidth: 0
            }]
        },
        options: {
            circumference: 270,
            rotation: 225,
            cutout: '80%',
            responsive: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            }
        }
    };
    
    const downloadGauge = new Chart(downloadCtx, gaugeOptions);
    const uploadGauge = new Chart(uploadCtx, gaugeOptions);
    const pingGauge = new Chart(pingCtx, {
        ...gaugeOptions,
        options: {
            ...gaugeOptions.options,
            datasets: [{
                data: [0, 100],
                backgroundColor: ['#4cc9f0', '#e9ecef'],
                borderWidth: 0
            }]
        }
    });
    
    // Update gauge function
    function updateGauge(gauge, value, max) {
        const percentage = Math.min((value / max) * 100, 100);
        gauge.data.datasets[0].data = [percentage, 100 - percentage];
        gauge.update();
    }
    
    // Render history
    function renderHistory() {
        const historyBody = document.getElementById('historyBody');
        historyBody.innerHTML = '';
        
        if (testHistory.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="4" style="text-align: center;">${translations[currentLang]['noHistory']}</td>`;
            historyBody.appendChild(row);
            return;
        }
        
        testHistory.slice().reverse().forEach(test => {
            const row = document.createElement('tr');
            
            const date = new Date(test.timestamp);
            const dateStr = date.toLocaleString(currentLang === 'ar' ? 'ar-SA' : 'en-US');
            
            // Convert speeds based on current unit
            const downloadSpeed = formatSpeed(test.download);
            const uploadSpeed = formatSpeed(test.upload);
            
            row.innerHTML = `
                <td>${dateStr}</td>
                <td>${downloadSpeed} ${currentUnit === 'mbps' ? 'Mbps' : 
                                      currentUnit === 'kbps' ? 'Kbps' : 
                                      currentUnit === 'mb' ? 'MB/s' : 'KB/s'}</td>
                <td>${uploadSpeed} ${currentUnit === 'mbps' ? 'Mbps' : 
                                      currentUnit === 'kbps' ? 'Kbps' : 
                                      currentUnit === 'mb' ? 'MB/s' : 'KB/s'}</td>
                <td>${test.ping.toFixed(0)} ms</td>
            `;
            
            historyBody.appendChild(row);
        });
    }
    
    // Save test to history
    function saveTestResult(download, upload, ping) {
        originalResults = { download, upload, ping };
        
        const testResult = {
            timestamp: Date.now(),
            download,
            upload,
            ping,
            isp: translations[currentLang]['unknown'],
            location: translations[currentLang]['unknown'],
            server: translations[currentLang]['unknown']
        };
        
        testHistory.push(testResult);
        if (testHistory.length > 10) {
            testHistory = testHistory.slice(-10);
        }
        
        localStorage.setItem('speedTestHistory', JSON.stringify(testHistory));
        renderHistory();
    }
    
    // Share functions
    document.getElementById('shareTwitter').addEventListener('click', function() {
        const download = document.getElementById('downloadValue').textContent;
        const upload = document.getElementById('uploadValue').textContent;
        const ping = document.getElementById('pingValue').textContent;
        
        const text = `${translations[currentLang]['download']}: ${download}, ${translations[currentLang]['upload']}: ${upload}, ${translations[currentLang]['ping']}: ${ping} - ${window.location.href}`;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
    });
    
    document.getElementById('shareFacebook').addEventListener('click', function() {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank');
    });
    
    document.getElementById('copyLink').addEventListener('click', function() {
        const download = document.getElementById('downloadValue').textContent;
        const upload = document.getElementById('uploadValue').textContent;
        const ping = document.getElementById('pingValue').textContent;
        
        const text = `${translations[currentLang]['download']}: ${download}, ${translations[currentLang]['upload']}: ${upload}, ${translations[currentLang]['ping']}: ${ping} - ${window.location.href}`;
        
        navigator.clipboard.writeText(text).then(() => {
            alert(translations[currentLang]['copySuccess']);
        }).catch(() => {
            alert(translations[currentLang]['copyError']);
        });
    });
    
    // Speed test functions
    async function testPing() {
        const start = performance.now();
        try {
            await fetch('https://httpbin.org/get', {
                cache: 'no-store',
                mode: 'no-cors'
            });
        } catch (e) {
            // Even if request fails, we can measure the time
        }
        return performance.now() - start;
    }
    
    async function testDownloadSpeed() {
        const fileSizeMB = 5;
        const url = `https://httpbin.org/bytes/${fileSizeMB * 1024 * 1024}`;
        
        const start = performance.now();
        try {
            const response = await fetch(url, {cache: 'no-store'});
            await response.arrayBuffer();
        } catch (e) {
            console.error('Download test error:', e);
            return 0;
        }
        const duration = (performance.now() - start) / 1000;
        
        return (fileSizeMB * 8) / duration;
    }
    
    async function testUploadSpeed() {
        // Note: This is a simulation as real upload test requires server
        const fileSizeMB = 1;
        const dummyData = new ArrayBuffer(fileSizeMB * 1024 * 1024);
        
        const start = performance.now();
        try {
            await fetch('https://httpbin.org/post', {
                method: 'POST',
                body: dummyData,
                cache: 'no-store'
            });
        } catch (e) {
            console.error('Upload test error:', e);
            return 0;
        }
        const duration = (performance.now() - start) / 1000;
        
        return (fileSizeMB * 8) / duration;
    }
    
    async function runSpeedTest() {
        const startBtn = document.getElementById('startTest');
        const resultsDiv = document.getElementById('results');
        const historyDiv = document.getElementById('history');
        const statusDiv = document.getElementById('status');
        const progressBar = document.getElementById('progressBar');
        const progressContainer = document.getElementById('progressContainer');
        
        startBtn.disabled = true;
        startBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${translations[currentLang]['startTest']}`;
        resultsDiv.style.display = 'none';
        historyDiv.style.display = 'none';
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        statusDiv.textContent = translations[currentLang]['ready'];
        
        try {
            // Test Ping
            statusDiv.textContent = translations[currentLang]['testingPing'];
            progressBar.style.width = '20%';
            originalResults.ping = await testPing();
            
            // Test Download
            statusDiv.textContent = translations[currentLang]['testingDownload'];
            progressBar.style.width = '40%';
            originalResults.download = await testDownloadSpeed();
            
            // Test Upload
            statusDiv.textContent = translations[currentLang]['testingUpload'];
            progressBar.style.width = '80%';
            originalResults.upload = await testUploadSpeed();
            
            // Update all displays with current unit
            updateDisplayedUnits();
            
            // Complete
            progressBar.style.width = '100%';
            statusDiv.textContent = translations[currentLang]['testComplete'];
            resultsDiv.style.display = 'block';
            historyDiv.style.display = 'block';
            
            // Save results
            saveTestResult(originalResults.download, originalResults.upload, originalResults.ping);
            
        } catch (error) {
            statusDiv.textContent = `Error: ${error.message}`;
            console.error('Speed test error:', error);
        } finally {
            startBtn.disabled = false;
            startBtn.innerHTML = `${translations[currentLang]['startTest']} <i class="fas fa-redo"></i>`;
        }
    }
    
    // Event listeners
    document.getElementById('startTest').addEventListener('click', runSpeedTest);
    
    // Initialize
    setLanguage(currentLang);
    renderHistory();
});