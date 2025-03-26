// Módulo de interfaz y feedback
export default class UIFeedbackManager {
    constructor() {
        this.createHandDebugUI();
        this.setupEventListeners();
        this.vrDebugPanel = null; // Referencia al panel VR
        this.leftHandState = { visible: false, gripping: false, heldObject: null };
        this.rightHandState = { visible: false, gripping: false, heldObject: null };
    }

    setupEventListeners() {
        document.addEventListener('hand-status-change', this.onHandStatusChange.bind(this));
        document.addEventListener('object-grabbed', this.onObjectGrabbed.bind(this));
        document.addEventListener('object-released', this.onObjectReleased.bind(this));
        document.addEventListener('object-hover', this.onObjectHover.bind(this));
        document.addEventListener('object-unhover', this.onObjectUnhover.bind(this));

        // Evento específico para gestos de puño
        document.addEventListener('hand-grip', this.onHandGrip.bind(this));

        // Añadir evento para crear panel al entrar en VR
        document.querySelector('a-scene').addEventListener('enter-vr', () => {
            console.log('Entrando en VR, creando panel de debug');
            this.createVRDebugPanel();
        });
    }

    //  método para manejar eventos de grip
    onHandGrip(event) {
        const { hand, gripping } = event.detail;
        const handName = hand.id === 'leftHand' ? 'izquierda' : 'derecha';
        const action = gripping ? 'cerrada' : 'abierta';

        // Actualizar el panel VR con la información del evento
        this.updateVRDebugPanel(`Mano ${handName} ${action}`);

        // mostrar feedback visual
        this.showFeedback(`Mano ${handName} ${action}`);
    }

    onHandStatusChange(event) {
        const { hand, visible } = event.detail;
        this.updateHandDebug();

        // Actualizar panel VR
        const handName = hand.id === 'leftHand' ? 'izquierda' : 'derecha';
        const status = visible ? 'detectada' : 'perdida';
        this.updateVRDebugPanel(`Mano ${handName} ${status}`);
    }

    onObjectGrabbed(event) {
        const { object, hand, objectType } = event.detail;
        this.showFeedback(`${objectType} agarrado`);
        this.updateHandDebug();

        const handName = hand.id === 'leftHand' ? 'izquierda' : 'derecha';
        this.updateVRDebugPanel(`${objectType} agarrado con mano ${handName}`);
    }

    onObjectReleased(event) {
        const { object, hand, objectType } = event.detail;
        this.showFeedback(`${objectType} liberado`);
        this.updateHandDebug();

        const handName = hand.id === 'leftHand' ? 'izquierda' : 'derecha';
        this.updateVRDebugPanel(`${objectType} liberado de mano ${handName}`);
    }

    // Actualiza el texto del panel de debug VR
    updateVRDebugPanel(message) {
        if (this.vrDebugPanel) {
            // Obtener valor actual para no perder el historial
            const currentText = this.vrDebugPanel.getAttribute('text').value;
            const lines = currentText.split('\n');

            // Mantener un historial de 5 líneas como máximo
            if (lines.length > 5) {
                lines.shift(); // Eliminar la línea más antigua
            }

            // Añadir el nuevo mensaje
            lines.push(message);

            // Actualizar el panel
            this.vrDebugPanel.setAttribute('text', 'value', lines.join('\n'));
        }
    }


    onObjectHover(event) {
        const { object, name } = event.detail;
        this.showInteractionHint(object, 'Cierra la mano para agarrar');
    }

    onObjectUnhover(event) {
        this.hideInteractionHint();
    }

    createHandDebugUI() {
        const debugEl = document.createElement('div');
        debugEl.id = 'hand-debug';
        debugEl.style = 'position: fixed; bottom: 20px; left: 20px; background: rgba(0,0,0,0.5); color: white; padding: 10px; font-family: monospace;';
        debugEl.innerHTML = 'Hand Tracking: Esperando...';
        document.body.appendChild(debugEl);
    }

    updateHandDebug() {
        const debugEl = document.getElementById('hand-debug');
        if (!debugEl) return;

        // Obtén el estado actual
        const leftHandVisible = document.querySelector('#leftHand')?.getAttribute('visible') !== false;
        const rightHandVisible = document.querySelector('#rightHand')?.getAttribute('visible') !== false;

        // Obtén información sobre objetos sostenidos
        const leftHandHeldObject = document.querySelector('#leftHand').childElementCount > 0;
        const rightHandHeldObject = document.querySelector('#rightHand').childElementCount > 0;

        if (leftHandVisible || rightHandVisible) {
            let debugText = `Hand Tracking: Activo<br>Izquierda: ${leftHandVisible ? '✓' : '✗'}<br>Derecha: ${rightHandVisible ? '✓' : '✗'}`;

            // Añadir información sobre objetos agarrados
            if (leftHandHeldObject) {
                debugText += `<br>Agarrando objeto (izq)`;
            }

            if (rightHandHeldObject) {
                debugText += `<br>Agarrando objeto (der)`;
            }

            debugEl.innerHTML = debugText;
            debugEl.style.background = 'rgba(0,128,0,0.5)';

            // Actualizar panel VR con información similar
            if (this.vrDebugPanel) {
                const vrDebugText = `Hand Tracking: Activo\nIzq: ${leftHandVisible ? '✓' : '✗'} | Der: ${rightHandVisible ? '✓' : '✗'}`;
                this.updateVRDebugPanel(vrDebugText);
            }
        } else {
            debugEl.innerHTML = 'Hand Tracking: No detectado';
            debugEl.style.background = 'rgba(128,0,0,0.5)';

            // Actualizar panel VR
            if (this.vrDebugPanel) {
                this.updateVRDebugPanel('Hand Tracking: No detectado');
            }
        }
    }

    showInteractionHint(object, hint) {
        let hintEl = document.getElementById('interaction-hint');
        if (!hintEl) {
            hintEl = document.createElement('div');
            hintEl.id = 'interaction-hint';
            hintEl.style = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.7); color: white; padding: 10px; border-radius: 5px; font-family: sans-serif;';
            document.body.appendChild(hintEl);
        }

        // Determinar el nombre del objeto
        let objectName = "objeto";
        if (object.hasAttribute('gltf-model')) {
            const modelId = object.getAttribute('gltf-model').replace('#', '');

            // Mapeo completo de todos los modelos
            switch (modelId) {
                case 'ambo':
                    objectName = "Ambo";
                    break;
                case 'dosdemayo':
                    objectName = "Dos de Mayo";
                    break;
                case 'huacaybamba':
                    objectName = "Huacaybamba";
                    break;
                case 'huamalies':
                    objectName = "Huamalíes";
                    break;
                case 'huanuco':
                    objectName = "Huánuco";
                    break;
                case 'lauricocha':
                    objectName = "Lauricocha";
                    break;
                case 'leoncioprado':
                    objectName = "Leoncio Prado";
                    break;
                case 'mara':
                    objectName = "Marañón";
                    break;
                case 'pachitea':
                    objectName = "Pachitea";
                    break;
                case 'puertoinca':
                    objectName = "Puerto Inca";
                    break;
                case 'yarowilca':
                    objectName = "Yarowilca";
                    break;
                default:
                    // Si es un modelo no reconocido, usar el ID con formato
                    objectName = modelId.charAt(0).toUpperCase() + modelId.slice(1).replace(/([A-Z])/g, ' $1');
            }
        } else {
            objectName = object.tagName.toLowerCase().replace('a-', '');
        }

        hintEl.innerHTML = `${objectName}: ${hint}`;
        hintEl.style.display = 'block';
    }

    hideInteractionHint() {
        const hintEl = document.getElementById('interaction-hint');
        if (hintEl) {
            hintEl.style.display = 'none';
        }
    }

    showFeedback(message) {
        let feedbackEl = document.getElementById('feedback');
        if (!feedbackEl) {
            feedbackEl = document.createElement('div');
            feedbackEl.id = 'feedback';
            feedbackEl.style = 'position: fixed; bottom: 70px; left: 50%; transform: translateX(-50%); background: rgba(0,128,0,0.7); color: white; padding: 10px; border-radius: 5px; font-family: sans-serif; transition: opacity 0.5s;';
            document.body.appendChild(feedbackEl);
        }

        feedbackEl.innerHTML = message;
        feedbackEl.style.opacity = '1';

        // Auto ocultar después de 2 segundos
        setTimeout(() => {
            feedbackEl.style.opacity = '0';
        }, 2000);
    }

    // Para el panel de debug en VR
    createVRDebugPanel() {
        const debugPanel = document.createElement('a-entity');
        debugPanel.id = 'vr-debug-panel';
        debugPanel.setAttribute('text', {
            value: 'Panel de Debug VR\nEsperando eventos...',
            color: 'white',
            width: 1,
            align: 'left'
        });
        debugPanel.setAttribute('geometry', {
            primitive: 'plane',
            width: 0.5,  // Un poco más ancho
            height: 0.3  // Un poco más alto para más líneas
        });
        debugPanel.setAttribute('material', {
            color: '#333',
            opacity: 0.7
        });

        // Posición mejorada para visibilidad
        debugPanel.setAttribute('position', '0.4 -0.3 -0.6');
        debugPanel.setAttribute('look-at', '[camera]');

        // Añadir al rig (para que siga a la cámara)
        document.querySelector('#camera').appendChild(debugPanel);

        // Guardar referencia para actualizaciones
        this.vrDebugPanel = debugPanel;

        return debugPanel;
    }
}