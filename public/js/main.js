<script>
    let temporizadorPreview;
    let intervaloFade;
    let tarjetaActual = null;

    function playBeat(beat, cardElement) {
        const player = document.getElementById('player');
        const currentOverlay = cardElement.querySelector('.play-overlay span');

        if (tarjetaActual === cardElement) {
            if (!player.paused) {
                limpiarTemporizadores();
                player.pause();
                player.volume = 1;
                cardElement.classList.remove('playing');
                if (currentOverlay) currentOverlay.textContent = '▶';
                tarjetaActual = null;
                return;
            }
        }

        limpiarTemporizadores();
        player.pause();
        player.volume = 1;

        document.querySelectorAll('.beat-card').forEach(card => {
            card.classList.remove('playing');
            const overlay = card.querySelector('.play-overlay span');
            if (overlay) overlay.textContent = '▶';
        });

        cardElement.classList.add('playing');
        if (currentOverlay) currentOverlay.textContent = '⏸';
        tarjetaActual = cardElement;

        player.src = beat;
        player.play();

        const tiempoPreview = 10; 
        const tiempoFade = 2;    

        temporizadorPreview = setTimeout(() => {
            let pasosVolume = 20;
            let intervaloTiempo = (tiempoFade * 1000) / pasosVolume;

            intervaloFade = setInterval(() => {
                if (tarjetaActual === cardElement && player.volume > 0.06) {
                    player.volume -= 0.05;
                } else {
                    limpiarTemporizadores();
                    if (tarjetaActual === cardElement) {
                        player.pause();
                        player.volume = 1;
                        cardElement.classList.remove('playing');
                        if (currentOverlay) currentOverlay.textContent = '▶';
                        tarjetaActual = null;
                    }
                }
            }, intervaloTiempo);

        }, (tiempoPreview - tiempoFade) * 1000);
    }

    function limpiarTemporizadores() {
        clearTimeout(temporizadorPreview);
        clearInterval(intervaloFade);
    }

    function scrollToSection(id) {
        const section = document.getElementById(id);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    }
        document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Previene que se abra el reproductor al hacer clic en el corazón
            e.stopPropagation(); 
            
            btn.classList.toggle('liked');
            
            // Opcional: Feedback visual extra
            if (btn.classList.contains('liked')) {
                btn.textContent = '❤️';
            } else {
                btn.textContent = '❤️'; 
            }
        });
    });
</script>
