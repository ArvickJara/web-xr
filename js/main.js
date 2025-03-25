document.addEventListener('DOMContentLoaded', () => {
    console.log('La aplicación Web VR está lista para usarse.');

    const scene = document.querySelector('a-scene');
    const leftHand = document.querySelector('#leftHand');
    const rightHand = document.querySelector('#rightHand');

    // Estado de manos y objetos
    let leftHandVisible = false;
    let rightHandVisible = false;

    // Variables para el manejo de objetos agarrados
    let leftHandGripping = false;
    let rightHandGripping = false;
    let leftHandHeldObject = null;
    let rightHandHeldObject = null;
    let originalParent = null;

    // Variables para la rotación de objetos
    let initialRotation = new THREE.Euler();
    let initialHandRotation = new THREE.Euler();
    let isRotating = false;
    let rotationSpeed = 2.0; // Velocidad de rotación

    // Eventos de hand tracking
    leftHand.addEventListener('hand-tracking-found', function () {
        console.log('Mano izquierda detectada');
        leftHandVisible = true;
        updateHandDebug();
    });

    rightHand.addEventListener('hand-tracking-found', function () {
        console.log('Mano derecha detectada');
        rightHandVisible = true;
        updateHandDebug();
    });

    leftHand.addEventListener('hand-tracking-lost', function () {
        console.log('Mano izquierda perdida');
        leftHandVisible = false;
        // Soltar cualquier objeto al perder el tracking
        if (leftHandHeldObject) {
            releaseObject(leftHand, leftHandHeldObject);
        }
        updateHandDebug();
    });

    rightHand.addEventListener('hand-tracking-lost', function () {
        console.log('Mano derecha perdida');
        rightHandVisible = false;
        // Soltar cualquier objeto al perder el tracking
        if (rightHandHeldObject) {
            releaseObject(rightHand, rightHandHeldObject);
        }
        updateHandDebug();
    });

    // Agregar eventos de agarre para las manos
    setupGrabInteractions();

    // Configurar interacciones para objetos
    setupObjectInteractions();

    // Visualización de estado de manos
    createHandDebugUI();

    // Función para configurar interacciones de agarre
    function setupGrabInteractions() {
        // Eventos para mano izquierda
        leftHand.addEventListener('pinchstarted', function () {
            console.log('Mano izquierda cerrada');
            leftHandGripping = true;
            tryGrabNearbyObject(leftHand);
        });

        leftHand.addEventListener('pinchended', function () {
            console.log('Mano izquierda abierta');
            leftHandGripping = false;
            if (leftHandHeldObject) {
                releaseObject(leftHand, leftHandHeldObject);
            }
        });

        // Eventos para mano derecha
        rightHand.addEventListener('pinchstarted', function () {
            console.log('Mano derecha cerrada');
            rightHandGripping = true;
            tryGrabNearbyObject(rightHand);
        });

        rightHand.addEventListener('pinchended', function () {
            console.log('Mano derecha abierta');
            rightHandGripping = false;
            if (rightHandHeldObject) {
                releaseObject(rightHand, rightHandHeldObject);
            }
        });

        // También escuchar eventos de pinch para modelos que no tienen grip
        leftHand.addEventListener('pinchstarted', function () {
            console.log('Pinch con mano izquierda');
            // Solo activar si no hay grip
            if (!leftHandGripping) {
                leftHandGripping = true;
                tryGrabNearbyObject(leftHand);
            }
        });

        leftHand.addEventListener('pinchended', function () {
            console.log('Fin de pinch con mano izquierda');
            if (leftHandGripping && !leftHand.is('grabbed')) {
                leftHandGripping = false;
                if (leftHandHeldObject) {
                    releaseObject(leftHand, leftHandHeldObject);
                }
            }
        });

        rightHand.addEventListener('pinchstarted', function () {
            console.log('Pinch con mano derecha');
            if (!rightHandGripping) {
                rightHandGripping = true;
                tryGrabNearbyObject(rightHand);
            }
        });

        rightHand.addEventListener('pinchended', function () {
            console.log('Fin de pinch con mano derecha');
            if (rightHandGripping && !rightHand.is('grabbed')) {
                rightHandGripping = false;
                if (rightHandHeldObject) {
                    releaseObject(rightHand, rightHandHeldObject);
                }
            }
        });
    }

    function tryGrabNearbyObject(hand) {
        // Obtener todos los objetos interactivos
        const interactables = document.querySelectorAll('.interactable');

        // Posición de la mano
        const handPosition = new THREE.Vector3();
        hand.object3D.getWorldPosition(handPosition);

        // Encontrar el objeto más cercano
        let closestObject = null;
        let closestDistance = 1.5; // Distancia máxima para agarrar (en metros)

        interactables.forEach(object => {
            // Verificar si el objeto ya está agarrado por la otra mano
            if ((hand === leftHand && object === rightHandHeldObject) ||
                (hand === rightHand && object === leftHandHeldObject)) {
                return; // Saltar este objeto
            }

            const objectPosition = new THREE.Vector3();
            object.object3D.getWorldPosition(objectPosition);

            const distance = handPosition.distanceTo(objectPosition);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestObject = object;
            }
        });

        // Si encontramos un objeto cercano, lo agarramos
        if (closestObject) {
            grabObject(hand, closestObject);
        }
    }

    function grabObject(hand, object) {
        // Identificar el tipo de objeto para el feedback
        let objectType = "objeto";
        if (object.hasAttribute('gltf-model')) {
            // Extraer el ID del modelo del atributo
            const modelId = object.getAttribute('gltf-model').replace('#', '');
            // Determinar cuál modelo es
            if (modelId === 'modelo1') objectType = "Ambo";
            else if (modelId === 'modelo2') objectType = "Dos de Mayo";
            else if (modelId === 'modelo3') objectType = "Huacaybamba";
            else objectType = "Modelo 3D";
        }

        console.log(`Agarrando ${objectType} con ${hand.id}`);

        // Guardar el padre original
        originalParent = object.parentNode;

        // Asignar el objeto a la mano correspondiente
        if (hand === leftHand) {
            leftHandHeldObject = object;
        } else {
            rightHandHeldObject = object;
        }

        // Guardar la posición y rotación original
        const worldPosition = new THREE.Vector3();
        const worldQuaternion = new THREE.Quaternion();
        object.object3D.getWorldPosition(worldPosition);
        object.object3D.getWorldQuaternion(worldQuaternion);

        // Guardar rotación inicial para la manipulación
        initialRotation.setFromQuaternion(worldQuaternion);
        hand.object3D.getWorldQuaternion(worldQuaternion);
        initialHandRotation.setFromQuaternion(worldQuaternion);

        // Adjuntar el objeto a la mano (reparentando)
        hand.appendChild(object);

        // Ajustar la posición local para que aparezca en frente de la mano
        object.setAttribute('position', '0 0 -0.2');

        // Aplicar efecto visual para modelos glTF
        applyEmissiveToModel(object, "#404040");

        // Iniciar rotación controlada
        startObjectManipulation(hand, object);

        showFeedback(`${objectType} agarrado`);
    }

    function startObjectManipulation(hand, object) {
        // Configurar variables para manipulación
        isRotating = true;

        // Crear un tick personalizado para este objeto
        const tickId = `object-manipulation-${Date.now()}`;

        // Función para actualizar la rotación en cada frame
        const manipulationTick = function () {
            if (!isRotating) return;

            if ((hand === leftHand && leftHandHeldObject === object) ||
                (hand === rightHand && rightHandHeldObject === object)) {

                // Calcular la rotación basada en el movimiento de la mano
                const currentHandRotation = new THREE.Euler();
                const handQuaternion = new THREE.Quaternion();
                hand.object3D.getWorldQuaternion(handQuaternion);
                currentHandRotation.setFromQuaternion(handQuaternion);

                // Aplicar rotación relativa al objeto
                // Esta es una versión simplificada que gira el objeto en Y basado en el cambio de rotación
                const rotDiff = currentHandRotation.y - initialHandRotation.y;
                const currentRot = object.getAttribute('rotation') || { x: 0, y: 0, z: 0 };
                object.setAttribute('rotation', {
                    x: currentRot.x,
                    y: currentRot.y + rotDiff * rotationSpeed * 3, // Amplificar el efecto
                    z: currentRot.z
                });

                // Actualizar la rotación inicial para el siguiente frame
                initialHandRotation.copy(currentHandRotation);
            } else {
                // Si el objeto ya no está agarrado, detener la manipulación
                scene.removeEventListener('tick', manipulationFunctions[tickId]);
                delete manipulationFunctions[tickId];
            }
        };

        // Almacenar la función para poder eliminarla después
        if (!window.manipulationFunctions) window.manipulationFunctions = {};
        window.manipulationFunctions[tickId] = manipulationTick;

        // Añadir el tick al bucle de animación
        scene.addEventListener('tick', manipulationTick);
    }

    function releaseObject(hand, object) {
        if (!object) return;

        // Identificar el tipo de objeto para el feedback
        let objectType = "objeto";
        if (object.hasAttribute('gltf-model')) {
            const modelId = object.getAttribute('gltf-model').replace('#', '');
            if (modelId === 'modelo1') objectType = "Ambo";
            else if (modelId === 'modelo2') objectType = "Dos de Mayo";
            else if (modelId === 'modelo3') objectType = "Huacaybamba";
            else objectType = "Modelo 3D";
        }

        console.log(`Soltando ${objectType}`);

        // Detener cualquier manipulación
        isRotating = false;

        // Obtener la posición mundial actual
        const worldPosition = new THREE.Vector3();
        const worldQuaternion = new THREE.Quaternion();
        object.object3D.getWorldPosition(worldPosition);
        object.object3D.getWorldQuaternion(worldQuaternion);

        // Devolver al padre original
        if (originalParent) {
            originalParent.appendChild(object);
        } else {
            scene.appendChild(object);
        }

        // Establecer la posición mundial para que quede en el mismo lugar
        object.setAttribute('position', {
            x: worldPosition.x,
            y: worldPosition.y,
            z: worldPosition.z
        });

        // Mantener la rotación actual
        const euler = new THREE.Euler().setFromQuaternion(worldQuaternion);
        object.setAttribute('rotation', {
            x: THREE.MathUtils.radToDeg(euler.x),
            y: THREE.MathUtils.radToDeg(euler.y),
            z: THREE.MathUtils.radToDeg(euler.z)
        });

        // Restablecer efecto visual
        applyEmissiveToModel(object, "#000000");

        // Limpiar referencias
        if (hand === leftHand) {
            leftHandHeldObject = null;
        } else {
            rightHandHeldObject = null;
        }

        showFeedback(`${objectType} liberado`);
    }

    // Función especializada para aplicar emissive a modelos glTF
    function applyEmissiveToModel(object, emissiveColor) {
        if (object.hasAttribute('gltf-model')) {
            // Para modelos glTF, necesitamos acceder al material del objeto 3D
            // Esto es asíncrono ya que el modelo puede estar cargándose
            const checkModelLoaded = () => {
                const model = object.getObject3D('mesh');
                if (model) {
                    model.traverse((node) => {
                        if (node.isMesh && node.material) {
                            if (Array.isArray(node.material)) {
                                node.material.forEach(mat => {
                                    if (!node.userData.originalEmissive) {
                                        node.userData.originalEmissive = mat.emissive ? mat.emissive.clone() : new THREE.Color(0, 0, 0);
                                    }
                                    if (mat.emissive) {
                                        if (emissiveColor === "#000000") {
                                            // Restaurar el emissive original
                                            mat.emissive.copy(node.userData.originalEmissive);
                                        } else {
                                            // Aplicar nuevo emissive
                                            mat.emissive.set(emissiveColor);
                                        }
                                    }
                                });
                            } else {
                                if (!node.userData.originalEmissive) {
                                    node.userData.originalEmissive = node.material.emissive ?
                                        node.material.emissive.clone() : new THREE.Color(0, 0, 0);
                                }
                                if (node.material.emissive) {
                                    if (emissiveColor === "#000000") {
                                        // Restaurar el emissive original
                                        node.material.emissive.copy(node.userData.originalEmissive);
                                    } else {
                                        // Aplicar nuevo emissive
                                        node.material.emissive.set(emissiveColor);
                                    }
                                }
                            }
                        }
                    });
                } else {
                    // Modelo aún no cargado, intentar de nuevo
                    setTimeout(checkModelLoaded, 100);
                }
            };

            checkModelLoaded();
        } else {
            // Para primitivas A-Frame, usamos el método normal
            object.setAttribute('material', 'emissive', emissiveColor);
        }
    }

    function createHandDebugUI() {
        const debugEl = document.createElement('div');
        debugEl.id = 'hand-debug';
        debugEl.style = 'position: fixed; bottom: 20px; left: 20px; background: rgba(0,0,0,0.5); color: white; padding: 10px; font-family: monospace;';
        debugEl.innerHTML = 'Hand Tracking: Esperando...';
        document.body.appendChild(debugEl);
    }

    function updateHandDebug() {
        const debugEl = document.getElementById('hand-debug');
        if (debugEl) {
            if (leftHandVisible || rightHandVisible) {
                let debugText = `Hand Tracking: Activo<br>Izquierda: ${leftHandVisible ? '✓' : '✗'}<br>Derecha: ${rightHandVisible ? '✓' : '✗'}`;

                // Añadir información sobre objetos agarrados
                if (leftHandHeldObject) {
                    const modelId = leftHandHeldObject.getAttribute('gltf-model')?.replace('#', '') || '';
                    let objectName = "objeto";

                    if (modelId === 'modelo1') objectName = "Ambo";
                    else if (modelId === 'modelo2') objectName = "Dos de Mayo";
                    else if (modelId === 'modelo3') objectName = "Huacaybamba";

                    debugText += `<br>Agarrando: ${objectName} (izq)`;
                }

                if (rightHandHeldObject) {
                    const modelId = rightHandHeldObject.getAttribute('gltf-model')?.replace('#', '') || '';
                    let objectName = "objeto";

                    if (modelId === 'modelo1') objectName = "Ambo";
                    else if (modelId === 'modelo2') objectName = "Dos de Mayo";
                    else if (modelId === 'modelo3') objectName = "Huacaybamba";

                    debugText += `<br>Agarrando: ${objectName} (der)`;
                }

                debugEl.innerHTML = debugText;
                debugEl.style.background = 'rgba(0,128,0,0.5)';
            } else {
                debugEl.innerHTML = 'Hand Tracking: No detectado';
                debugEl.style.background = 'rgba(128,0,0,0.5)';
            }
        }
    }

    // Configuración de interacciones con objetos
    function setupObjectInteractions() {
        // Referencias a todos los objetos interactivos
        const interactables = document.querySelectorAll('.interactable');

        // Añadir eventos de proximidad para resaltar objetos
        interactables.forEach(object => {
            object.addEventListener('mouseenter', highlightObject);
            object.addEventListener('mouseleave', unhighlightObject);
        });
    }

    // Funciones de interacción
    function highlightObject(event) {
        applyEmissiveToModel(event.target, "#404040");
        showInteractionHint(event.target, 'Cierra la mano para agarrar');
    }

    function unhighlightObject(event) {
        // No quitar el resaltado si está siendo agarrado
        if (event.target === leftHandHeldObject || event.target === rightHandHeldObject) {
            return;
        }

        applyEmissiveToModel(event.target, "#000000");
        hideInteractionHint();
    }

    // Funciones de UI para feedback
    function showInteractionHint(object, hint) {
        let hintEl = document.getElementById('interaction-hint');
        if (!hintEl) {
            hintEl = document.createElement('div');
            hintEl.id = 'interaction-hint';
            hintEl.style = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.7); color: white; padding: 10px; border-radius: 5px; font-family: sans-serif;';
            document.body.appendChild(hintEl);
        }

        // Determinar el nombre del objeto para el hint
        let objectName = "objeto";
        if (object.hasAttribute('gltf-model')) {
            const modelId = object.getAttribute('gltf-model').replace('#', '');
            if (modelId === 'modelo1') objectName = "Ambo";
            else if (modelId === 'modelo2') objectName = "Dos de Mayo";
            else if (modelId === 'modelo3') objectName = "Huacaybamba";
        } else {
            objectName = object.tagName.toLowerCase().replace('a-', '');
        }

        hintEl.innerHTML = `${objectName}: ${hint}`;
        hintEl.style.display = 'block';
    }

    function hideInteractionHint() {
        const hintEl = document.getElementById('interaction-hint');
        if (hintEl) {
            hintEl.style.display = 'none';
        }
    }

    function showFeedback(message) {
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

    scene.addEventListener('loaded', function () {
        console.log('Escena cargada completamente');
    });

    scene.addEventListener('enter-vr', function () {
        console.log('Usuario entró en modo VR');
        // En modo VR, mejorar la visibilidad del panel de debug
        const debugEl = document.getElementById('hand-debug');
        if (debugEl) {
            debugEl.style.fontSize = '14px';
            debugEl.style.padding = '15px';
        }
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