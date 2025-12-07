import React from 'react';
import MessageBubble from './MessageBubble';
import Image from 'next/image';

interface Message {
  text: string;
  sender: "alice" | "user";
  time: string;
  isRead?: boolean | null;
}

interface AvatarProps {
  sender: string;
}

const Avatar: React.FC<AvatarProps> = ({ sender }) => {
  if (sender !== 'alice') return null;

  return (
    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xl flex-shrink-0">
      <Image
        src="/images/Alice_icon.png"
        alt="Alice icon"
        width={40}
        height={40}
      />
    </div>
  );
};

interface MessageItemProps {
  message: Message;
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => (
  <div className={`flex flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
    {/* メッセージバブルとアバターの配置 */}
    <div className={`flex items-end space-x-2 max-w-xs ${message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
      }`}>
      <Avatar sender={message.sender} />
      <MessageBubble message={message.text} sender={message.sender} />
    </div>

    {/* 時刻と既読ステータスの表示 */}
    <div
      className={`text-xs mt-1 font-semibold
    ${message.sender === 'user' ? 'text-right' : 'text-left'}
    ${message.sender === 'alice' ? 'ml-12' : 'mr-2'}`}
      style={{
        color: message.sender === 'user' ? '#C4A878' : '#C4A878', // 例：userは濃い青、他はグレー系
      }}
    >
      {/* ユーザーメッセージで既読の場合のみ "既読" を表示 */}
      {message.isRead && message.sender === 'user' ? '既読 ' : ''}
      {message.time}
    </div>

  </div>
);

export default MessageItem;