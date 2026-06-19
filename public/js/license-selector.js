<script>

const cards =
document.querySelectorAll('.license-card');

const price =
document.getElementById('selected-price');

const licenseName =
document.getElementById('license-name');

const termsGrid =
document.getElementById('terms-grid');

const licenses = {

    29: {
        name: 'Basic Lease (€29)',
        terms: [
            '🎵 MP3 File',
            '📡 5.000 Streams',
            '🎬 1 Music Video',
            '🎤 Live Performances',
            '📀 500 Copies',
            '📻 Radio Rights'
        ]
    },

    59: {
        name: 'Premium Lease (€59)',
        terms: [
            '🎵 WAV + MP3',
            '📡 50.000 Streams',
            '🎬 2 Music Videos',
            '🎤 Live Performances',
            '📀 5.000 Copies',
            '📻 Radio Rights'
        ]
    },

    149: {
        name: 'Unlimited Lease (€149)',
        terms: [
            '🎵 WAV + STEMS + MP3',
            '📡 Unlimited Streams',
            '🎬 Unlimited Videos',
            '🎤 Unlimited Shows',
            '📀 Unlimited Copies',
            '📻 Radio Rights'
        ]
    },

    299: {
        name: 'Exclusive Rights (€299)',
        terms: [
            '👑 Exclusive Ownership',
            '🎵 WAV + STEMS',
            '📡 Unlimited Streams',
            '🎬 Unlimited Videos',
            '🎤 Unlimited Shows',
            '🚫 Beat Removed From Store'
        ]
    }
};

cards.forEach(card => {

    card.addEventListener('click', () => {

        cards.forEach(c =>
            c.classList.remove('active')
        );

        card.classList.add('active');

        const selectedPrice =
            card.dataset.price;

        price.textContent =
            '€' + selectedPrice;

        licenseName.textContent =
            licenses[selectedPrice].name;

        termsGrid.innerHTML =
            licenses[selectedPrice].terms
            .map(term => `<div>${term}</div>`)
            .join('');

    });

});
</script>
