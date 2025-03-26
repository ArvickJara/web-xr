// Módulo de hand tracking simplificado
export default class HandTrackingManager {
    constructor(scene) {
        this.scene = scene;
        this.leftHand = document.querySelector('#leftHand');
        this.rightHand = document.querySelector('#rightHand');

        // Estado de manos
        this.leftHandVisible = false;
        this.rightHandVisible = false;
        this.leftHandGripping = false;
        this.rightHandGripping = false;

        // Configura eventos de tracking
        this.setupHandTracking();
    }

    setupHandTracking() {
        // Eventos de hand tracking para mano izquierda
        this.leftHand.addEventListener('hand-tracking-found', () => {
            console.log('Mano izquierda detectada');
            this.leftHandVisible = true;

            // Emitir evento
            const handEvent = new CustomEvent('hand-status-change', {
                detail: { hand: this.leftHand, visible: true }
            });
            document.dispatchEvent(handEvent);
        });

        this.leftHand.addEventListener('hand-tracking-lost', () => {
            console.log('Mano izquierda perdida');
            this.leftHandVisible = false;
            this.leftHandGripping = false;

            // Emitir evento
            const handEvent = new CustomEvent('hand-status-change', {
                detail: { hand: this.leftHand, visible: false }
            });
            document.dispatchEvent(handEvent);

            // Emitir evento de liberación forzada
            const releaseEvent = new CustomEvent('hand-lost-with-object', {
                detail: { hand: this.leftHand }
            });
            document.dispatchEvent(releaseEvent);
        });

        // Eventos de hand tracking para mano derecha
        this.rightHand.addEventListener('hand-tracking-found', () => {
            console.log('Mano derecha detectada');
            this.rightHandVisible = true;

            // Emitir evento
            const handEvent = new CustomEvent('hand-status-change', {
                detail: { hand: this.rightHand, visible: true }
            });
            document.dispatchEvent(handEvent);
        });

        this.rightHand.addEventListener('hand-tracking-lost', () => {
            console.log('Mano derecha perdida');
            this.rightHandVisible = false;
            this.rightHandGripping = false;

            // Emitir evento
            const handEvent = new CustomEvent('hand-status-change', {
                detail: { hand: this.rightHand, visible: false }
            });
            document.dispatchEvent(handEvent);

            // Emitir evento de liberación forzada
            const releaseEvent = new CustomEvent('hand-lost-with-object', {
                detail: { hand: this.rightHand }
            });
            document.dispatchEvent(releaseEvent);
        });

        // Iniciar detección continua de gestos
        this.startGestureDetection();
    }

    // Método para iniciar la detección continua de gestos
    startGestureDetection() {
        // Añadir evento para detectar cambios en la posición de los dedos en cada frame
        this.scene.addEventListener('tick', () => {
            this.checkHandGestures();
        });
    }

    // Método para verificar gestos de mano continuamente
    checkHandGestures() {
        // Solo ejecutar si las manos están visibles
        if (this.leftHandVisible) {
            const wasGripping = this.leftHandGripping;
            const isInFist = this.isHandInFist(this.leftHand);

            // Si la mano está en puño y no estaba agarrando, activar agarre
            if (isInFist && !wasGripping) {
                console.log('Puño cerrado detectado en mano izquierda');
                this.leftHandGripping = true;

                // Emitir evento
                const gripEvent = new CustomEvent('hand-grip', {
                    detail: { hand: this.leftHand, gripping: true }
                });
                document.dispatchEvent(gripEvent);
            }
            // Si la mano no está en puño pero estaba agarrando, desactivar agarre
            else if (!isInFist && wasGripping) {
                console.log('Puño abierto en mano izquierda');
                this.leftHandGripping = false;

                // Emitir evento
                const gripEvent = new CustomEvent('hand-grip', {
                    detail: { hand: this.leftHand, gripping: false }
                });
                document.dispatchEvent(gripEvent);
            }
        }

        // Lo mismo para la mano derecha
        if (this.rightHandVisible) {
            const wasGripping = this.rightHandGripping;
            const isInFist = this.isHandInFist(this.rightHand);

            if (isInFist && !wasGripping) {
                console.log('Puño cerrado detectado en mano derecha');
                this.rightHandGripping = true;

                const gripEvent = new CustomEvent('hand-grip', {
                    detail: { hand: this.rightHand, gripping: true }
                });
                document.dispatchEvent(gripEvent);
            }
            else if (!isInFist && wasGripping) {
                console.log('Puño abierto en mano derecha');
                this.rightHandGripping = false;

                const gripEvent = new CustomEvent('hand-grip', {
                    detail: { hand: this.rightHand, gripping: false }
                });
                document.dispatchEvent(gripEvent);
            }
        }
    }

    // Método para verificar si una mano está en puño
    isHandInFist(hand) {
        // Intentar obtener datos de la mano desde el componente
        const handComponent = hand.components['hand-tracking-controls'];
        if (handComponent && handComponent.fingerCurlValues) {
            // Calcular el promedio de curvatura de los dedos (sin incluir el pulgar)
            const curlValues = handComponent.fingerCurlValues.slice(1); // Excluir pulgar
            const avgCurl = curlValues.reduce((sum, curl) => sum + curl, 0) / curlValues.length;
            // Umbral ajustable (0-1): valores más bajos harán más sensible la detección
            return avgCurl > 0.6;
        }

        // Método alternativo basado en posiciones de dedos
        try {
            const mesh = hand.getObject3D('mesh');
            if (!mesh) return false;

            // Verificar si tenemos acceso a las posiciones de los dedos
            const fingerTips = this.getFingerTipPositions(hand);
            if (!fingerTips) return false;

            // Calcular distancias de puntas de dedos a palma
            const palm = this.getPalmPosition(hand);
            if (!palm) return false;

            // Contar cuántos dedos están cerca de la palma
            let closeFingers = 0;
            for (const tipPos of fingerTips) {
                const distance = palm.distanceTo(tipPos);
                // Umbral ajustable: valores más altos harán más sensible la detección
                if (distance < 0.05) closeFingers++;
            }

            // Si al menos 2 dedos están cerca de la palma, consideramos que es un puño
            return closeFingers >= 2;
        } catch (e) {
            console.warn('Error detectando puño:', e);
            return false;
        }
    }

    // Obtener posiciones de puntas de dedos (si están disponibles)
    getFingerTipPositions(hand) {
        try {
            const handComponent = hand.components['hand-tracking-controls'];
            if (handComponent && handComponent.bones) {
                // Nombres típicos de las puntas de los dedos en el modelo
                const tipNames = ['index-finger-tip', 'middle-finger-tip', 'ring-finger-tip', 'pinky-finger-tip'];
                const positions = [];

                for (const tipName of tipNames) {
                    const bone = handComponent.bones[tipName];
                    if (bone) {
                        const position = new THREE.Vector3();
                        bone.getWorldPosition(position);
                        positions.push(position);
                    }
                }

                return positions.length > 0 ? positions : null;
            }
        } catch (e) {
            console.warn('Error obteniendo posiciones de dedos:', e);
        }
        return null;
    }

    // Obtener posición de la palma
    getPalmPosition(hand) {
        try {
            const handComponent = hand.components['hand-tracking-controls'];
            if (handComponent && handComponent.bones) {
                const bone = handComponent.bones['wrist'];
                if (bone) {
                    const position = new THREE.Vector3();
                    bone.getWorldPosition(position);
                    return position;
                }
            }
        } catch (e) {
            console.warn('Error obteniendo posición de palma:', e);
        }
        return null;
    }

    // Métodos de consulta de estado
    isHandVisible(hand) {
        if (hand === this.leftHand) {
            return this.leftHandVisible;
        } else if (hand === this.rightHand) {
            return this.rightHandVisible;
        }
        return false;
    }

    isHandGripping(hand) {
        if (hand === this.leftHand) {
            return this.leftHandGripping;
        } else if (hand === this.rightHand) {
            return this.rightHandGripping;
        }
        return false;
    }
}