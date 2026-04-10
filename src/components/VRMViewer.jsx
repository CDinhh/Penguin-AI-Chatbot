import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { VRMLoaderPlugin, VRMUtils, VRMExpressionPresetName } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';

const isProd = window.location.hostname !== '127.0.0.1' && window.location.hostname !== 'localhost';
const getUrl = (path) => path;

const VRMA_ANIMATION_URLS = [
    getUrl('VRMA/Angry.vrma'),
    getUrl('VRMA/Blush.vrma'),
    getUrl('VRMA/Clapping.vrma'),
    getUrl('VRMA/Dancing.vrma'),
    getUrl('VRMA/Goodbye.vrma'),
    getUrl('VRMA/Jump.vrma'),
    getUrl('VRMA/LookAround.vrma'),
    getUrl('VRMA/Relax.vrma'),
    getUrl('VRMA/Sad.vrma'),
    getUrl('VRMA/Sleepy.vrma'),
    getUrl('VRMA/Surprised.vrma'),
    getUrl('VRMA/Thinking.vrma'),
    getUrl('VRMA/VRMA_01.vrma'),
    getUrl('VRMA/VRMA_02.vrma'),
    getUrl('VRMA/VRMA_03.vrma'),
    getUrl('VRMA/VRMA_04.vrma'),
    getUrl('VRMA/VRMA_05.vrma'),
    getUrl('VRMA/VRMA_06.vrma'),
    getUrl('VRMA/VRMA_07.vrma'),
];

const BACKGROUND_PRESET = {
    label: 'Passendorf Snow',
    url: getUrl('hdr/passendorf_snow_4k.hdr'),
};

export function VRMViewer({
    vrmModel,
    onAnimationsLoaded,
    onStatusChange,
    mouthOpen,
    selectedAnimation,
    backgroundType,
}) {
    const MIN_LOADING_OVERLAY_MS = 420;
    const containerRef = useRef(null);
    const rendererRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const controlsRef = useRef(null);
    const currentVrmRef = useRef(null);
    const mixerRef = useRef(null);
    const actionRef = useRef(null);
    const loaderRef = useRef(null);
    const animationFrameRef = useRef(null);
    const clockRef = useRef(new THREE.Clock());
    const loadingSinceRef = useRef(0);
    const hideOverlayTimeoutRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
    const [isOverlayVisible, setIsOverlayVisible] = useState(true);

    useEffect(() => {
        return () => {
            if (hideOverlayTimeoutRef.current) {
                clearTimeout(hideOverlayTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const isBusy = isLoading || isBackgroundLoading;

        if (isBusy) {
            if (hideOverlayTimeoutRef.current) {
                clearTimeout(hideOverlayTimeoutRef.current);
                hideOverlayTimeoutRef.current = null;
            }
            loadingSinceRef.current = performance.now();
            setIsOverlayVisible(true);
            return;
        }

        const elapsed = performance.now() - loadingSinceRef.current;
        const delay = Math.max(0, MIN_LOADING_OVERLAY_MS - elapsed);

        hideOverlayTimeoutRef.current = setTimeout(() => {
            setIsOverlayVisible(false);
            hideOverlayTimeoutRef.current = null;
        }, delay);
    }, [isLoading, isBackgroundLoading]);

    useEffect(() => {
        if (!containerRef.current) return;

        try {
            const width = window.innerWidth;
            const height = window.innerHeight;

            const renderer = new THREE.WebGLRenderer({
                antialias: true,
                powerPreference: 'high-performance',
                preserveDrawingBuffer: false,
            });
            renderer.setSize(width, height);
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.outputColorSpace = THREE.SRGBColorSpace;
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.0;
            containerRef.current.appendChild(renderer.domElement);
            rendererRef.current = renderer;

            const camera = new THREE.PerspectiveCamera(30.0, width / height, 0.1, 20.0);
            camera.position.set(0.0, 1.0, 5.0);
            cameraRef.current = camera;

            const controls = new OrbitControls(camera, renderer.domElement);
            controls.screenSpacePanning = true;
            controls.target.set(0.0, 1.0, 0.0);
            controls.update();
            controlsRef.current = controls;

            const scene = new THREE.Scene();
            sceneRef.current = scene;

            const light = new THREE.DirectionalLight(0xffffff, 3.0);
            light.position.set(1.0, 1.0, 1.0).normalize();
            scene.add(light);

            const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
            scene.add(ambientLight);

            const loader = new GLTFLoader();
            loader.crossOrigin = 'anonymous';
            loader.register((parser) => new VRMLoaderPlugin(parser));
            loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
            loaderRef.current = loader;

            const loadBackground = async () => {
                try {
                    if (backgroundType === 'hdr') {
                        // Load HDR environment map
                        const rgbeLoader = new RGBELoader();
                        const texture = await rgbeLoader.loadAsync(BACKGROUND_PRESET.url);
                        texture.mapping = THREE.EquirectangularReflectionMapping;

                        const pmremGenerator = new THREE.PMREMGenerator(renderer);
                        const envMap = pmremGenerator.fromEquirectangular(texture).texture;
                        scene.background = texture;
                        scene.environment = envMap;
                        pmremGenerator.dispose();
                    } else {
                        // Video mode: use video element as texture
                        const video = document.createElement('video');
                        video.src = getUrl('video.mp4');
                        video.loop = true;
                        video.muted = true;
                        video.play().catch(() => {
                            console.warn('Failed to play video, using gradient fallback');
                            createGradientBackground(scene);
                        });

                        const videoTexture = new THREE.VideoTexture(video);
                        scene.background = videoTexture;
                    }
                } catch (error) {
                    console.warn('Failed to load background:', error);
                    createGradientBackground(scene);
                }
            };

            const createGradientBackground = (scn) => {
                const canvas = document.createElement('canvas');
                canvas.width = 1024;
                canvas.height = 512;
                const ctx = canvas.getContext('2d');
                const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                grad.addColorStop(0, '#09111f');
                grad.addColorStop(0.45, '#12395f');
                grad.addColorStop(1, '#f7b267');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                const texture = new THREE.CanvasTexture(canvas);
                scn.background = texture;
            };

            loadBackground();

            const handleResize = () => {
                const w = window.innerWidth;
                const h = window.innerHeight;
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
                renderer.setSize(w, h);
            };

            window.addEventListener('resize', handleResize);

            const animate = () => {
                animationFrameRef.current = requestAnimationFrame(animate);
                const deltaTime = clockRef.current.getDelta();

                if (mixerRef.current) {
                    mixerRef.current.update(deltaTime);
                }

                if (currentVrmRef.current) {
                    currentVrmRef.current.update(deltaTime);
                }

                controls.update();
                renderer.render(scene, camera);
            };

            animate();

            return () => {
                window.removeEventListener('resize', handleResize);
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                }
                if (containerRef.current && renderer.domElement.parentElement === containerRef.current) {
                    containerRef.current.removeChild(renderer.domElement);
                }
                renderer.dispose();
            };
        } catch (error) {
            console.error('Failed to initialize Three.js:', error);
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!sceneRef.current || !vrmModel || !loaderRef.current) return;

        (async () => {
            try {
                setIsLoading(true);
                onStatusChange?.('Loading VRM model...');

                const modelUrl = getUrl(`VRM/${vrmModel}`);
                const gltf = await loaderRef.current.loadAsync(modelUrl);

                if (currentVrmRef.current?.scene) {
                    sceneRef.current.remove(currentVrmRef.current.scene);
                }

                if (mixerRef.current) {
                    // Stop and remove all actions from old mixer
                    mixerRef.current.stopAllAction();
                    // Clear all animations from mixer
                    const actions = mixerRef.current._actions.slice();
                    actions.forEach(action => {
                        mixerRef.current.uncacheAction(action.clip);
                        mixerRef.current.uncacheRoot(action.getRoot());
                    });
                    mixerRef.current = null;
                }

                // Clear animation action refs to prevent caching old animations
                actionRef.current = null;

                const vrm = gltf.userData.vrm;
                if (!vrm) {
                    throw new Error('Invalid VRM file');
                }

                VRMUtils.rotateVRM0(vrm);
                sceneRef.current.add(vrm.scene);
                currentVrmRef.current = vrm;

                const mixer = new THREE.AnimationMixer(vrm.scene);
                mixerRef.current = mixer;

                (async () => {
                    try {
                        const animationData = new Array(VRMA_ANIMATION_URLS.length).fill(null);
                        for (let i = 0; i < VRMA_ANIMATION_URLS.length; i++) {
                            try {
                                const gltfAnim = await loaderRef.current.loadAsync(VRMA_ANIMATION_URLS[i]);
                                const vrmaAnimation = gltfAnim?.userData?.vrmaAnimation
                                    || gltfAnim?.userData?.vrmAnimations?.[0]
                                    || gltfAnim?.userData?.vrmAnimation;

                                if (vrmaAnimation) {
                                    const clip = createVRMAnimationClip(vrmaAnimation, vrm);
                                    if (clip) {
                                        animationData[i] = { name: clip.name || `anim-${i}`, clip };
                                    }
                                }
                            } catch (err) {
                                console.warn(`Failed to load animation ${i}:`, err);
                            }
                        }

                        // Keep panel usable as soon as at least one animation is valid.
                        const loadedCount = animationData.filter(Boolean).length;
                        if (loadedCount > 0) {
                            onStatusChange?.(`Ready (${loadedCount}/${VRMA_ANIMATION_URLS.length} animations)`);
                        }
                        onAnimationsLoaded?.(animationData);
                        setIsLoading(false);
                    } catch (error) {
                        console.warn('Failed to load animations:', error);
                        setIsLoading(false);
                    }
                })();

                onStatusChange?.('Ready');
            } catch (error) {
                console.error('Failed to load VRM:', error);
                onStatusChange?.('Failed to load model');
                setIsLoading(false);
            }
        })();
    }, [vrmModel, onStatusChange, onAnimationsLoaded]);

    useEffect(() => {
        if (!currentVrmRef.current?.expressionManager) return;
        const mouthValue = Math.max(0, Math.min(1, mouthOpen));
        currentVrmRef.current.expressionManager.setValue(VRMExpressionPresetName.Aa, mouthValue);
    }, [mouthOpen]);

    useEffect(() => {
        if (!selectedAnimation || !mixerRef.current || !currentVrmRef.current) return;

        // Completely stop and clear all previous actions
        mixerRef.current.stopAllAction();
        if (actionRef.current) {
            actionRef.current.stop();
            actionRef.current = null;
        }

        const clip = selectedAnimation.clip;
        if (clip) {
            const action = mixerRef.current.clipAction(clip);
            action.reset();
            action.enabled = true;
            action.setEffectiveWeight(1);
            action.setEffectiveTimeScale(1);
            action.loop = THREE.LoopRepeat;
            action.clampWhenFinished = true;
            action.play();
            actionRef.current = action;
        }
    }, [selectedAnimation]);

    // Reload background when type changes
    useEffect(() => {
        if (!sceneRef.current || !rendererRef.current) return;

        (async () => {
            setIsBackgroundLoading(true);
            try {
                if (backgroundType === 'hdr') {
                    const rgbeLoader = new RGBELoader();
                    const texture = await rgbeLoader.loadAsync(BACKGROUND_PRESET.url);
                    texture.mapping = THREE.EquirectangularReflectionMapping;

                    const pmremGenerator = new THREE.PMREMGenerator(rendererRef.current);
                    const envMap = pmremGenerator.fromEquirectangular(texture).texture;
                    sceneRef.current.background = texture;
                    sceneRef.current.environment = envMap;
                    pmremGenerator.dispose();
                } else {
                    // Video mode: use video element as texture
                    const video = document.createElement('video');
                    video.src = getUrl('video.mp4');
                    video.loop = true;
                    video.muted = true;
                    video.play().catch(() => {
                        console.warn('Failed to play video, using gradient fallback');
                        const canvas = document.createElement('canvas');
                        canvas.width = 1024;
                        canvas.height = 512;
                        const ctx = canvas.getContext('2d');
                        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                        grad.addColorStop(0, '#09111f');
                        grad.addColorStop(0.45, '#12395f');
                        grad.addColorStop(1, '#f7b267');
                        ctx.fillStyle = grad;
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        const texture = new THREE.CanvasTexture(canvas);
                        sceneRef.current.background = texture;
                    });

                    const videoTexture = new THREE.VideoTexture(video);
                    sceneRef.current.background = videoTexture;
                }
            } catch (error) {
                console.warn('Failed to reload background:', error);
                const canvas = document.createElement('canvas');
                canvas.width = 1024;
                canvas.height = 512;
                const ctx = canvas.getContext('2d');
                const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                grad.addColorStop(0, '#09111f');
                grad.addColorStop(0.45, '#12395f');
                grad.addColorStop(1, '#f7b267');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                const texture = new THREE.CanvasTexture(canvas);
                sceneRef.current.background = texture;
            } finally {
                setIsBackgroundLoading(false);
            }
        })();
    }, [backgroundType]);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
            <AnimatePresence>
                {isOverlayVisible && (
                    <motion.div
                        id="loadingOverlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                    >
                        <div className="loader-spinner" />
                        <motion.div
                            className="loader-text"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.08, duration: 0.3 }}
                        >
                            ĐANG TẢI DỮ LIỆU
                        </motion.div>
                        <motion.div
                            className="loader-subtext"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.16, duration: 0.3 }}
                        >
                            Đang đốt cỡ 100mb của bạn để tải
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
