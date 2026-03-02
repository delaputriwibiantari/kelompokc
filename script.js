const URL = "./dataset/";

let model, webcam, labelContainer, maxPredictions;
let isWebcamRunning = false;

// Tabs Logic
const webcamTab = document.getElementById('webcam-tab');
const uploadTab = document.getElementById('upload-tab');
const webcamView = document.getElementById('webcam-view');
const uploadView = document.getElementById('upload-view');

webcamTab.addEventListener('click', () => {
    webcamTab.classList.add('active');
    uploadTab.classList.remove('active');
    webcamView.classList.add('active');
    uploadView.classList.remove('active');
    stopWebcam(); // Stop webcam if switching tabs
});

uploadTab.addEventListener('click', () => {
    uploadTab.classList.add('active');
    webcamTab.classList.remove('active');
    uploadView.classList.add('active');
    webcamView.classList.remove('active');
    stopWebcam();
});

// Load the image model
async function init() {
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    try {
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();

        document.getElementById('loading-model').classList.add('hidden');

        // Prepare prediction bars
        labelContainer = document.getElementById("label-container");
        for (let i = 0; i < maxPredictions; i++) {
            const barWrapper = document.createElement("div");
            barWrapper.className = "prediction-bar";
            barWrapper.innerHTML = `
                <div class="label-info">
                    <span class="label-text">...</span>
                    <span class="conf-text">0%</span>
                </div>
                <div class="bar-bg">
                    <div class="bar-fill" style="width: 0%"></div>
                </div>
            `;
            labelContainer.appendChild(barWrapper);
        }
    } catch (e) {
        console.error("Error loading model:", e);
        document.getElementById('loading-model').innerText = "Gagal memuat model. Pastikan file model ada di folder dataset/.";
    }
}

// Webcam Logic
async function startWebcam() {
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');

    const flip = true;
    webcam = new tmImage.Webcam(500, 500, flip);
    await webcam.setup();
    await webcam.play();
    isWebcamRunning = true;
    window.requestAnimationFrame(loop);

    document.getElementById("webcam-container").appendChild(webcam.canvas);
    startBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
}

function stopWebcam() {
    if (webcam) {
        webcam.stop();
        const container = document.getElementById("webcam-container");
        if (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        isWebcamRunning = false;
        document.getElementById('start-btn').classList.remove('hidden');
        document.getElementById('stop-btn').classList.add('hidden');
    }
}

async function loop() {
    if (!isWebcamRunning) return;
    webcam.update();
    await predict(webcam.canvas);
    window.requestAnimationFrame(loop);
}

document.getElementById('start-btn').addEventListener('click', startWebcam);
document.getElementById('stop-btn').addEventListener('click', stopWebcam);

// Prediction Logic
async function predict(imageElement) {
    const prediction = await model.predict(imageElement);
    for (let i = 0; i < maxPredictions; i++) {
        const classPrediction = prediction[i].className;
        const probability = (prediction[i].probability * 100).toFixed(0);

        const bar = labelContainer.childNodes[i];
        bar.querySelector('.label-text').innerText = classPrediction;
        bar.querySelector('.conf-text').innerText = probability + "%";
        bar.querySelector('.bar-fill').style.width = probability + "%";

        // Highlight top prediction
        if (prediction[i].probability > 0.5) {
            bar.querySelector('.bar-fill').style.background = "#e67e22";
        } else {
            bar.querySelector('.bar-fill').style.background = "#d4a373";
        }
    }
}

// Upload Logic
const imageUpload = document.getElementById('image-upload');
const dropZone = document.getElementById('drop-zone');
const previewContainer = document.getElementById('preview-container');
const imagePreview = document.getElementById('image-preview');
const reuploadBtn = document.getElementById('reupload-btn');
const resetUploadBtn = document.getElementById('reset-upload-btn');

function showPreview(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        imagePreview.src = e.target.result;
        previewContainer.classList.remove('hidden');
        dropZone.classList.add('hidden');

        // Auto predict on selection for better UX
        setTimeout(() => predict(imagePreview), 100);
    };
    reader.readAsDataURL(file);
}

function resetUpload() {
    previewContainer.classList.add('hidden');
    dropZone.classList.remove('hidden');
    imageUpload.value = '';
    imagePreview.src = '';

    // Clear predictions
    for (let i = 0; i < maxPredictions; i++) {
        const bar = labelContainer.childNodes[i];
        bar.querySelector('.conf-text').innerText = "0%";
        bar.querySelector('.bar-fill').style.width = "0%";
    }
}

dropZone.addEventListener('click', () => imageUpload.click());

imageUpload.addEventListener('change', function () {
    if (this.files && this.files[0]) {
        showPreview(this.files[0]);
    }
});

reuploadBtn.addEventListener('click', () => imageUpload.click());
resetUploadBtn.addEventListener('click', resetUpload);

document.getElementById('predict-upload-btn').addEventListener('click', async () => {
    await predict(imagePreview);
});

// Drag and drop events
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drop-zone--over');
});

["dragleave", "dragend"].forEach(type => {
    dropZone.addEventListener(type, () => {
        dropZone.classList.remove('drop-zone--over');
    });
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) {
        imageUpload.files = e.dataTransfer.files;
        showPreview(e.dataTransfer.files[0]);
    }
    dropZone.classList.remove('drop-zone--over');
});

// Initialize on load
init();
