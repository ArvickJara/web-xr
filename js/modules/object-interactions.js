// Módulo de interacciones con objetos
export default class ObjectInteractionManager {
    constructor(scene) {
        this.scene = scene;
        this.leftHand = document.querySelector('#leftHand');
        this.rightHand = document.querySelector('#rightHand');

        // Estado de objetos
        this.leftHandHeldObject = null;
        this.rightHandHeldObject = null;
        this.originalParent = null;

        // Variables para la rotación de objetos
        this.initialRotation = new THREE.Euler();
        this.initialHandRotation = new THREE.Euler();
        this.isRotating = false;
        this.rotationSpeed = 2.0;

        // Almacena funciones de manipulación
        this.manipulationFunctions = {};

        // Configura eventos
        this.setupObjectInteractions();
    }

    // Configuración de interacciones con objetos
    setupObjectInteractions() {
        // Referencias a todos los objetos interactivos
        const interactables = document.querySelectorAll('.interactable');

        // Añadir eventos de proximidad para resaltar objetos
        interactables.forEach(object => {
            object.addEventListener('mouseenter', this.highlightObject.bind(this));
            object.addEventListener('mouseleave', this.unhighlightObject.bind(this));
        });
    }

    // Intenta agarrar un objeto cercano
    tryGrabNearbyObject(hand) {
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
            if ((hand === this.leftHand && object === this.rightHandHeldObject) ||
                (hand === this.rightHand && object === this.leftHandHeldObject)) {
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
            this.grabObject(hand, closestObject);
            return true;
        }

        return false;
    }

    // Agarra un objeto
    grabObject(hand, object) {
        // Identificar el tipo de objeto para el feedback
        let objectType = this.getObjectName(object);

        console.log(`Agarrando ${objectType} con ${hand.id}`);

        // Guardar el padre original
        this.originalParent = object.parentNode;

        // Asignar el objeto a la mano correspondiente
        if (hand === this.leftHand) {
            this.leftHandHeldObject = object;
        } else {
            this.rightHandHeldObject = object;
        }

        // Guardar la posición y rotación original
        const worldPosition = new THREE.Vector3();
        const worldQuaternion = new THREE.Quaternion();
        object.object3D.getWorldPosition(worldPosition);
        object.object3D.getWorldQuaternion(worldQuaternion);

        // Guardar rotación inicial para la manipulación
        this.initialRotation.setFromQuaternion(worldQuaternion);
        hand.object3D.getWorldQuaternion(worldQuaternion);
        this.initialHandRotation.setFromQuaternion(worldQuaternion);

        // Adjuntar el objeto a la mano (reparentando)
        hand.appendChild(object);

        // Ajustar la posición local para que aparezca en frente de la mano
        object.setAttribute('position', '0 0 -0.2');

        // Aplicar efecto visual para modelos glTF
        this.applyEmissiveToModel(object, "#404040");

        // Iniciar rotación controlada
        this.startObjectManipulation(hand, object);

        // Emitir evento
        const grabEvent = new CustomEvent('object-grabbed', {
            detail: { object: object, hand: hand, objectType: objectType }
        });
        document.dispatchEvent(grabEvent);

        return objectType;
    }

    // Inicia manipulación de objeto
    startObjectManipulation(hand, object) {
        // Configurar variables para manipulación
        this.isRotating = true;

        // Crear un tick personalizado para este objeto
        const tickId = `object-manipulation-${Date.now()}`;

        // Función para actualizar la rotación en cada frame
        const manipulationTick = () => {
            if (!this.isRotating) return;

            if ((hand === this.leftHand && this.leftHandHeldObject === object) ||
                (hand === this.rightHand && this.rightHandHeldObject === object)) {

                // Calcular la rotación basada en el movimiento de la mano
                const currentHandRotation = new THREE.Euler();
                const handQuaternion = new THREE.Quaternion();
                hand.object3D.getWorldQuaternion(handQuaternion);
                currentHandRotation.setFromQuaternion(handQuaternion);

                // Aplicar rotación relativa al objeto
                const rotDiff = currentHandRotation.y - this.initialHandRotation.y;
                const currentRot = object.getAttribute('rotation') || { x: 0, y: 0, z: 0 };
                object.setAttribute('rotation', {
                    x: currentRot.x,
                    y: currentRot.y + rotDiff * this.rotationSpeed * 3,
                    z: currentRot.z
                });

                // Actualizar la rotación inicial para el siguiente frame
                this.initialHandRotation.copy(currentHandRotation);
            } else {
                // Si el objeto ya no está agarrado, detener la manipulación
                this.scene.removeEventListener('tick', this.manipulationFunctions[tickId]);
                delete this.manipulationFunctions[tickId];
            }
        };

        // Almacenar la función para poder eliminarla después
        this.manipulationFunctions[tickId] = manipulationTick;

        // Añadir el tick al bucle de animación
        this.scene.addEventListener('tick', manipulationTick);
    }

    // Libera un objeto
    releaseObject(hand, object) {
        if (!object) return;

        // Identificar el tipo de objeto para el feedback
        let objectType = this.getObjectName(object);

        console.log(`Soltando ${objectType}`);

        // Detener cualquier manipulación
        this.isRotating = false;

        // Obtener la posición mundial actual
        const worldPosition = new THREE.Vector3();
        const worldQuaternion = new THREE.Quaternion();
        object.object3D.getWorldPosition(worldPosition);
        object.object3D.getWorldQuaternion(worldQuaternion);

        // Devolver al padre original
        if (this.originalParent) {
            this.originalParent.appendChild(object);
        } else {
            this.scene.appendChild(object);
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
        this.applyEmissiveToModel(object, "#000000");

        // Limpiar referencias
        if (hand === this.leftHand) {
            this.leftHandHeldObject = null;
        } else {
            this.rightHandHeldObject = null;
        }

        // Emitir evento
        const releaseEvent = new CustomEvent('object-released', {
            detail: { object: object, hand: hand, objectType: objectType }
        });
        document.dispatchEvent(releaseEvent);

        return objectType;
    }

    // Resalta un objeto (hover)
    highlightObject(event) {
        this.applyEmissiveToModel(event.target, "#404040");

        // Emitir evento
        const hoverEvent = new CustomEvent('object-hover', {
            detail: { object: event.target, name: this.getObjectName(event.target) }
        });
        document.dispatchEvent(hoverEvent);
    }

    // Quita resaltado
    unhighlightObject(event) {
        // No quitar el resaltado si está siendo agarrado
        if (event.target === this.leftHandHeldObject || event.target === this.rightHandHeldObject) {
            return;
        }

        this.applyEmissiveToModel(event.target, "#000000");

        // Emitir evento
        const unhoverEvent = new CustomEvent('object-unhover', {
            detail: { object: event.target }
        });
        document.dispatchEvent(unhoverEvent);
    }

    // Aplica efecto emissive a modelos glTF
    applyEmissiveToModel(object, emissiveColor) {
        if (object.hasAttribute('gltf-model')) {
            // Para modelos glTF, necesitamos acceder al material del objeto 3D
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
                                            mat.emissive.copy(node.userData.originalEmissive);
                                        } else {
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
                                        node.material.emissive.copy(node.userData.originalEmissive);
                                    } else {
                                        node.material.emissive.set(emissiveColor);
                                    }
                                }
                            }
                        }
                    });
                } else {
                    setTimeout(checkModelLoaded, 100);
                }
            };

            checkModelLoaded();
        } else {
            object.setAttribute('material', 'emissive', emissiveColor);
        }
    }

    // Obtiene el nombre de un objeto
    getObjectName(object) {
        let objectName = "objeto";
        if (object.hasAttribute('gltf-model')) {
            const modelId = object.getAttribute('gltf-model').replace('#', '');
            if (modelId === 'modelo1' || modelId === 'ambo') objectName = "Ambo";
            else if (modelId === 'modelo2' || modelId === 'dosdemayo') objectName = "Dos de Mayo";
            else if (modelId === 'modelo3' || modelId === 'huacaybamba') objectName = "Huacaybamba";
            else objectName = modelId; // Si no reconocemos el ID, usar el ID como nombre
        } else {
            objectName = object.tagName.toLowerCase().replace('a-', '');
        }
        return objectName;
    }

    // Verifica si un objeto está siendo agarrado
    isObjectHeld(object) {
        return object === this.leftHandHeldObject || object === this.rightHandHeldObject;
    }

    // Obtiene el objeto sostenido por una mano
    getHeldObject(hand) {
        if (hand === this.leftHand) {
            return this.leftHandHeldObject;
        } else if (hand === this.rightHand) {
            return this.rightHandHeldObject;
        }
        return null;
    }
}