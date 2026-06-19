<script>
const params = new URLSearchParams(window.location.search);

console.log(params.get('audio'));

document.getElementById('beat-title').textContent =
    params.get('title');

document.getElementById('beat-img').src =
    params.get('img');

document.getElementById('player-title').textContent =
    params.get('title');

document.getElementById('player-cover').src =
    params.get('img');

const audio =
    document.getElementById('audio-player');

audio.src =
    params.get('audio');

const wavesurfer = WaveSurfer.create({
    container: '#waveform',
    waveColor: '#2a3440',
    progressColor: '#4ecdc4',
    cursorColor: '#4ecdc4',
    height: 40,
    normalize: true,
    responsive: true,
    barWidth: 0
});

wavesurfer.load(params.get('audio'));

const currentTime =
document.getElementById('current-time');

const durationTime =
document.getElementById('duration-time');

wavesurfer.on('ready', () => {

    durationTime.textContent =
        formatTime(wavesurfer.getDuration());

});

wavesurfer.on('audioprocess', () => {

    currentTime.textContent =
        formatTime(wavesurfer.getCurrentTime());

});

wavesurfer.on('seek', () => {

    currentTime.textContent =
        formatTime(wavesurfer.getCurrentTime());

});


const playBtn =
    document.getElementById('play-btn');


let isPlaying = false;

playBtn.addEventListener('click', () => {

    wavesurfer.playPause();

    const playerBar =
        document.querySelector('.music-player');

    if (wavesurfer.isPlaying()) {

        playerBar.classList.add('active');

        playBtn.innerHTML =
            '<i class="fas fa-pause"></i>';

    } else {

        playBtn.innerHTML =
            '<i class="fas fa-play"></i>';

    }

});
function formatTime(seconds) {

    const mins =
        Math.floor(seconds / 60);

    const secs =
        Math.floor(seconds % 60);

    return `${mins}:${secs
        .toString()
        .padStart(2, '0')}`;
}

audio.addEventListener('ended', () => {

    playBtn.innerHTML =
        '<i class="fas fa-play"></i>';

    isPlaying = false;

    progressBar.value = 0;
});

const coverPlay =
    document.querySelector('.play-circle');

coverPlay.addEventListener('click', () => {

    wavesurfer.playPause();

    const playerBar =
        document.querySelector('.music-player');

    if (wavesurfer.isPlaying()) {

        playerBar.classList.add('active');

        playBtn.innerHTML =
            '<i class="fas fa-pause"></i>';

        coverPlay.innerHTML =
            '<i class="fas fa-pause"></i>';

    } else {

        playBtn.innerHTML =
            '<i class="fas fa-play"></i>';

        coverPlay.innerHTML =
            '<i class="fas fa-play"></i>';
    }

});

</script>
