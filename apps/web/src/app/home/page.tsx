"use client";
import Image from "next/image";
import { Home_Header } from "@/components/home_header";
import NavigationButton from "@/components/navigation_buttun";
import ChatIcon from "@/components/icon/chat";
import Memory_Icon from "@/components/icon/memory";
import SettingIcon from "@/components/icon/setting";
import { Goal } from "@/components/goal";
import { useState, useEffect } from "react";


export default function Home() {
  // ① 初期値を「関数」で渡すと、初回マウント時だけ実行される
  const [isStart, setIsStart] = useState<boolean>(() => {
    if (typeof window === "undefined") return true; // SSR 対策
    return sessionStorage.getItem("timerCompleted") !== "true";
  });

  const [todayGoal, setTodayGoal] = useState<string>("");

  // タイマー完了時の通知モーダル表示状態
  const [showNotification, setShowNotification] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("timerCompleted") === "true";
  });

  // ② 副作用で sessionStorage をクリーンアップ
  useEffect(() => {
    if (!isStart && !showNotification) {
      sessionStorage.removeItem("timerCompleted");
    }
  }, [isStart, showNotification]);

  // 通知モーダルを閉じる処理
  const handleCloseNotification = () => {
    setShowNotification(false);
    setIsStart(false);
    sessionStorage.removeItem("timerCompleted");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-900/40">
      {/* 背景画像 */}
      <Image
        src="/images/home.png"
        alt="Space background"
        fill
        className="object-cover z-0"
      />
      
      <div className="relative z-10">
        <Home_Header />
        <Goal onChange={setTodayGoal} isStart={isStart}   />
        
          <div className="flex justify-center pt-10">
            <NavigationButton
              href="timer"
              label="ポロモードタイマー"
              variant="timer"
              icon=""
            />
          </div>

          <div className="mt-8 flex justify-center gap-6 ">
            <NavigationButton href="chat" label="" variant="chat" icon={<ChatIcon />} />
            <NavigationButton href="memory" label="" variant="memory"icon={<Memory_Icon />} />

          </div>
        </div>
      </div>

  );
}
