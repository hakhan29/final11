const video = document.getElementById('video');
const expressionDiv = document.getElementById('expression');
const colorBox = document.getElementById('colorBox'); // 감정 색상 박스

// 감정별 음악 파일 경로
const emotionSounds = {
    anger: './sounds/anger.mp3',
    happy: './sounds/happy.mp3',
    sad: './sounds/sad.mp3',
    neutral: './sounds/neutral.mp3',
    surprised: './sounds/surprised.mp3',
    fear: './sounds/fear.mp3',
};

// 현재 사운드와 페이드 관리 변수
let currentSound = null;
let fadeInterval = null;

// 모델 파일 로드
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('./models'),
    faceapi.nets.faceExpressionNet.loadFromUri('./models')
]).then(startVideo);

function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: {} })
        .then(stream => video.srcObject = stream)
        .catch(err => console.error(err));
}

// 페이드아웃 함수
function fadeOut(sound, callback) {
    clearInterval(fadeInterval);
    fadeInterval = setInterval(() => {
        if (sound.volume > 0.1) {
            sound.volume -= 0.1;
        } else {
            sound.volume = 0;
            clearInterval(fadeInterval);
            if (callback) callback();
        }
    }, 100);
}

// 페이드인 함수
function fadeIn(sound) {
    clearInterval(fadeInterval);
    fadeInterval = setInterval(() => {
        if (sound.volume < 0.9) {
            sound.volume += 0.1;
        } else {
            sound.volume = 1;
            clearInterval(fadeInterval);
        }
    }, 100);
}

// 감정에 따른 음악 재생
function playEmotionSound(emotion) {
    const soundPath = emotionSounds[emotion];
    if (!soundPath) return;

    if (currentSound) {
        fadeOut(currentSound, () => {
            currentSound.pause();
            currentSound.currentTime = 0;
            currentSound = null;
        });
    }

    currentSound = new Audio(soundPath);
    currentSound.volume = 0;
    currentSound.play();
    fadeIn(currentSound);
}

// 감정 감지 후 UI 업데이트
video.addEventListener('play', () => {
    const canvas = faceapi.createCanvasFromMedia(video);
    document.body.append(canvas);

    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceExpressions();

        if (detections.length > 0) {
            const expressions = detections[0].expressions;

            // 감정 중 가장 높은 비율의 감정 찾기
            const highestExpression = Object.keys(expressions).reduce((a, b) =>
                expressions[a] > expressions[b] ? a : b
            );

            // 감정별 색상 정의
            const emotionColors = {
                anger: 'rgb(255, 0, 0)',
                happy: 'rgb(255, 255, 0)',
                sad: 'rgb(0, 0, 255)',
                neutral: 'rgb(128, 128, 128)',
                surprised: 'rgb(255, 165, 0)',
                fear: 'rgb(128, 0, 128)',
            };

            const dominantColor = emotionColors[highestExpression] || 'white';

            // 배경색 전환
            document.body.style.transition = 'background-color 1s ease';
            document.body.style.backgroundColor = dominantColor;

            // 감정 텍스트 애니메이션
            expressionDiv.style.transition = 'opacity 0.5s ease';
            expressionDiv.style.opacity = '0'; // 페이드아웃
            setTimeout(() => {
                expressionDiv.textContent = `Detected Expression: ${highestExpression}`;
                expressionDiv.style.opacity = '1'; // 페이드인
            }, 500);

            // 감정 색상 박스 그라데이션 업데이트
            colorBox.style.background = `linear-gradient(to bottom, ${dominantColor}, white)`;

            // 감정별 음악 재생
            playEmotionSound(highestExpression);
        } else {
            // 얼굴이 감지되지 않았을 때 기본 설정
            expressionDiv.textContent = 'No face detected';
            expressionDiv.style.transition = 'opacity 0.5s ease';
            expressionDiv.style.opacity = '1'; // 페이드인

            document.body.style.backgroundColor = 'black';
            colorBox.style.background = 'white';
        }
    }, 100);
});
