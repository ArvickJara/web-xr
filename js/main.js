// Este archivo contiene el código JavaScript para la lógica adicional de la aplicación Web VR. 
// Puedes agregar funciones para manejar interacciones, eventos y comportamientos específicos aquí.

document.addEventListener('DOMContentLoaded', () => {
    // Inicialización de la escena o lógica adicional
    console.log('La aplicación Web VR está lista para usarse.');

    const scene = document.querySelector('a-scene');
    const leftHand = document.querySelector('#leftHand');
    const rightHand = document.querySelector('#rightHand');

    scene.addEventListener('enter-vr', () => {
        if (navigator.userAgent.includes('OculusBrowser') ||
            navigator.userAgent.includes('Quest')) {
            console.log('Dispositivo Meta/Oculus detectado.');
        }
    });

    scene.addEventListener('exit-vr', () => {
        console.log('Usuario salió del modo VR');
    });

    // Configuración de objetos interactivos
    const box = document.querySelector('a-box');
    const sphere = document.querySelector('a-sphere');
    const cylinder = document.querySelector('a-cylinder');

    // Registrar componentes personalizados para interacción con manos
    AFRAME.registerComponent('gesture-handler', {
        schema: {
            enabled: { default: true },
            rotationFactor: { default: 5 },
            minScale: { default: 0.3 },
            maxScale: { default: 8 },
        },

        init: function () {
            this.handlePinch = this.handlePinch.bind(this);
            this.el.sceneEl.addEventListener('pinchstarted', this.handlePinch);
        },

        handlePinch: function (evt) {
            if (this.el === evt.detail.target) {
                // Cambiar color con pinch (pellizco)
                const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16);
                this.el.setAttribute('color', randomColor);
            }
        },

        remove: function () {
            this.el.sceneEl.removeEventListener('pinchstarted', this.handlePinch);
        }
    });

    // Añadir el componente de manejo de gestos a objetos interactivos
    const interactables = document.querySelectorAll('.interactable');
    interactables.forEach(el => {
        el.setAttribute('gesture-handler', '');
    });

    // Eventos tradicionales (controladores y cursor)
    box.addEventListener('click', function () {
        const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16);
        this.setAttribute('color', randomColor);
    });

    sphere.addEventListener('mouseenter', function () {
        this.setAttribute('scale', '1.2 1.2 1.2');
    });

    sphere.addEventListener('mouseleave', function () {
        this.setAttribute('scale', '1 1 1');
    });

    // También añadir eventos para interacción con manos
    sphere.addEventListener('gripdown', function () {
        this.setAttribute('scale', '1.3 1.3 1.3');
    });

    sphere.addEventListener('gripup', function () {
        this.setAttribute('scale', '1 1 1');
    });

    let isRotating = false;
    cylinder.addEventListener('click', function () {
        toggleRotation(this);
    });

    // También activar rotación con gestos de mano
    cylinder.addEventListener('pinchstarted', function () {
        toggleRotation(this);
    });

    function toggleRotation(element) {
        isRotating = !isRotating;
        if (isRotating) {
            element.setAttribute('animation', 'property: rotation; to: 0 360 0; loop: true; dur: 2000; easing: linear');
        } else {
            element.removeAttribute('animation');
        }
    }

    // Detectar cambios en el modo de entrada (controladores vs manos)
    scene.addEventListener('enter-vr', () => {
        if (scene.is('ar-mode')) {
            enableHandTracking();
        }
    });

    function enableHandTracking() {
        console.log("Habilitando seguimiento de manos");
        // Eventos específicos para modo hand tracking
        document.querySelectorAll('[hand-tracking-controls]').forEach(hand => {
            hand.addEventListener('pinchstarted', function (evt) {
                console.log(`Pinch iniciado con ${evt.detail.hand}`);
            });
        });
    }

    scene.addEventListener('loaded', () => {
        if (!navigator.xr) {
            console.error('WebXR no está soportado en este navegador');
        }
    });
});