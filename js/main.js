// Importar módulos
import ObjectInteractionManager from './modules/object-interactions.js';
import HandTrackingManager from './modules/hand-tracking.js';
import UIFeedbackManager from './modules/ui-feedback.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('La aplicación Web VR está lista para usarse.');

    const scene = document.querySelector('a-scene');

    // Inicializar módulos
    const handTrackingManager = new HandTrackingManager(scene);
    const objectManager = new ObjectInteractionManager(scene);
    const uiManager = new UIFeedbackManager();

    // Conectar eventos entre módulos
    document.addEventListener('hand-grip', (event) => {
        const { hand, gripping } = event.detail;

        if (gripping) {
            objectManager.tryGrabNearbyObject(hand);
        } else {
            const heldObject = objectManager.getHeldObject(hand);
            if (heldObject) {
                objectManager.releaseObject(hand, heldObject);
            }
        }
    });

    document.addEventListener('hand-lost-with-object', (event) => {
        const { hand } = event.detail;
        const heldObject = objectManager.getHeldObject(hand);
        if (heldObject) {
            objectManager.releaseObject(hand, heldObject);
        }
    });

    // Configurar eventos de escena
    scene.addEventListener('loaded', function () {
        console.log('Escena cargada completamente');
    });

    scene.addEventListener('enter-vr', function () {
        console.log('Usuario entró en modo VR');
        // Configurar panel de debug para VR
        uiManager.createVRDebugPanel();
    });

    // Añadir evento para detectar cuando WebXR está disponible
    if (navigator.xr) {
        console.log('WebXR disponible en este navegador');
        navigator.xr.isSessionSupported('immersive-ar').then(supported => {
            console.log('AR inmersivo soportado: ' + supported);
        });
        navigator.xr.isSessionSupported('immersive-vr').then(supported => {
            console.log('VR inmersivo soportado: ' + supported);
        });
    } else {
        console.warn('WebXR no está disponible en este navegador');
    }
});