"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
// @ts-ignore
import { VRMLoaderPlugin } from "@pixiv/three-vrm";

export default function TestPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const vrmRef = useRef<any>(null);
  const MOUTH_LIST = ["aa", "ih", "ou", "ee", "oh"];

  useEffect(() => {
    if (!containerRef.current) return;

    // ✅ 全画面サイズ
    const SCREEN_WIDTH = window.innerWidth;
    const SCREEN_HEIGHT = window.innerHeight;

    // ✅ レンダラー設定
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      precision: "highp",
    });

    renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    containerRef.current.appendChild(renderer.domElement);

    // ✅ シーン
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // ✅ ライト
    const ambientLight = new THREE.AmbientLight(0xffffff, 2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(3, 5, 3);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // ✅ カメラ（アバターが安定して大きく見える位置）
    const camera = new THREE.PerspectiveCamera(
      50,
      SCREEN_WIDTH / SCREEN_HEIGHT,
      0.1,
      20.0
    );
    camera.position.set(0, 1.2, 2.2); // ✅ マイナス禁止・プラスが正解
    camera.lookAt(0, 1.2, 0);

    // ✅ リサイズ対応（サイズが変わっても崩れない）
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);

    // ✅ VRM ローダー
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    let time = 0;

    // ✅ アニメーションループ
    const animate = () => {
      requestAnimationFrame(animate);
      time += 0.01;

      if (vrmRef.current) {
        const vrm = vrmRef.current;

        // ✅ 上下ゆらゆら
        vrm.scene.position.y = Math.sin(time * 0.1) * 0.02;

        const baseRotationY = Math.PI; // ✅ 正面向きの基準

        vrm.scene.rotation.y = baseRotationY + Math.sin(time * 0.9) * 0.05;


            // ✅ あ・い・う・え・お を順番に口パク
      if (vrm.expressionManager) {
        const speed = 4; // ← 数字を大きくすると早口になる
        const t = time * speed;

        const open = Math.abs(Math.sin(t)); // 口の開き具合 0〜1

        // いったん全部リセット
        vrm.expressionManager.setValue("aa", 0);
        vrm.expressionManager.setValue("ih", 0);
        vrm.expressionManager.setValue("ou", 0);
        vrm.expressionManager.setValue("ee", 0);
        vrm.expressionManager.setValue("oh", 0);

        // どの母音にするかを時間で切り替え
        const vowelIndex = Math.floor(t) % 5;

        switch (vowelIndex) {
          case 0: // あ
            vrm.expressionManager.setValue("aa", open);
            break;
          case 1: // い
            vrm.expressionManager.setValue("ih", open);
            break;
          case 2: // う
            vrm.expressionManager.setValue("ou", open);
            break;
          case 3: // え
            vrm.expressionManager.setValue("ee", open);
            break;
          case 4: // お
            vrm.expressionManager.setValue("oh", open);
            break;
        }

        vrm.expressionManager.update();
      }


        // ✅ 瞬き
        if (vrm.expressionManager && Math.random() < 0.003) {
          const blink = async () => {
            vrm.expressionManager.setValue("blinkLeft", 1.0);
            vrm.expressionManager.setValue("blinkRight", 1.0);
            vrm.expressionManager.update();

            await new Promise((r) => setTimeout(r, 50));

            for (let i = 1.0; i >= 0; i -= 0.1) {
              vrm.expressionManager.setValue("blinkLeft", i);
              vrm.expressionManager.setValue("blinkRight", i);
              vrm.expressionManager.update();
              await new Promise((r) => setTimeout(r, 5));
            }
          };
          blink();
        }
      }

      renderer.render(scene, camera);
    };

    // ✅ VRM 読み込み
    loader.load(
      "/models/model.vrm", // ✅ public/models/model.vrm
      (gltf: any) => {
        const vrm = gltf.userData.vrm;
        vrmRef.current = vrm;
        scene.add(vrm.scene);

        vrm.scene.rotation.y = Math.PI; // ✅ 正面をこちらに向ける


        // ✅ 【最重要】サイズを完全固定（変動しない）
        vrm.scene.scale.set(1.2, 1.2, 1.2);

        // ✅ 地面にちゃんと立たせる
        const bbox = new THREE.Box3().setFromObject(vrm.scene);
        vrm.scene.position.y = -bbox.min.y;

        // ✅ 腕のポーズ
        if (vrm.humanoid) {
          const rightUpperArm = vrm.humanoid.getRawBoneNode("rightUpperArm");
          const rightLowerArm = vrm.humanoid.getRawBoneNode("rightLowerArm");
          const rightHand     = vrm.humanoid.getRawBoneNode("rightHand");
          if (rightUpperArm && rightLowerArm) {
            rightUpperArm.rotation.z = -1.3;
            rightUpperArm.rotation.x = 0.1;
            rightLowerArm.rotation.x = 0.1;

            rightHand.rotation.y = 0.1;      
            rightHand.rotation.z = 0.01; 
          }

          const leftUpperArm = vrm.humanoid.getRawBoneNode("leftUpperArm");
          const leftLowerArm = vrm.humanoid.getRawBoneNode("leftLowerArm");
          const leftHand     = vrm.humanoid.getRawBoneNode("leftHand");
          if (leftUpperArm && leftLowerArm) {
            leftUpperArm.rotation.z = 1.3;
            leftUpperArm.rotation.x = 0.1;
            leftLowerArm.rotation.x = 0.5;

            leftHand.rotation.y = 0.1;      
            leftHand.rotation.z = 0.1; 
          }
        }

        animate();
      },
      undefined,
      (error) => console.error("VRMロードエラー:", error)
    );

    // ✅ クリーンアップ
    return () => {
      window.removeEventListener("resize", handleResize);
      containerRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  // ✅ 全画面表示（中央寄せなし）
  return <div ref={containerRef} className="w-screen h-screen" />;
}
