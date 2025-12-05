import React from 'react';
import Image from 'next/image';

interface TypingIndicatorProps {
    isVisible: boolean;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isVisible }) => {
    if (!isVisible) return null;

    return (
        <>
            <style jsx>{`
        @keyframes typingDot {
          0%, 60%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          30% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .typing-dot {
          animation: typingDot 1.8s infinite ease-in-out;
        }
        
        .typing-dot:nth-child(1) {
          animation-delay: 0s;
        }
        
        .typing-dot:nth-child(2) {
          animation-delay: 0.6s;
        }
        
        .typing-dot:nth-child(3) {
          animation-delay: 1.2s;
        }
        
        .typing-indicator {
          animation: fadeIn 0.3s ease-in;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

            <div className="flex flex-col items-start typing-indicator">
                {/* メッセージバブルとアバターの配置 */}
                <div className="flex items-end space-x-2 max-w-xs">
                    {/* Aliceのアバター */}
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xl flex-shrink-0">
                        <Image
                            src="/images/Alice_icon.png"
                            alt="Alice icon"
                            width={40}
                            height={40}
                        />
                    </div>

                    {/* タイピングインジケーターバブル */}
                    <div
                        className="p-3 rounded-2xl flex items-center justify-center min-w-[60px]"
                        style={{
                            backgroundColor: '#F5F5F5',
                            color: '#876934',
                            border: '1px solid #876934',
                        }}
                    >
                        <div className="flex space-x-1">
                            <div className="w-2 h-2 rounded-full bg-gray-500 typing-dot"></div>
                            <div className="w-2 h-2 rounded-full bg-gray-500 typing-dot"></div>
                            <div className="w-2 h-2 rounded-full bg-gray-500 typing-dot"></div>
                        </div>
                    </div>
                </div>

                {/* タイピング中のテキスト */}
                <div
                    className="text-xs mt-1 font-semibold ml-12"
                    style={{ color: '#C4A878' }}
                >
                    入力中...
                </div>
            </div>
        </>
    );
};

export default TypingIndicator;