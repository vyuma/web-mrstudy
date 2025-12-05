import React from 'react';

interface MessageBubbleProps {
  message: string;
  sender: string;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, sender }) => {
  return (

  <div
  className="p-3 rounded-2xl"
  style={{
    backgroundColor: sender === 'user' ? '#FDDE81' : '#FFFFFF',
    color: sender === 'user' ? '#876934' : '#876934',
    border: '1px solid #876934', 
  }}
>
  {message}
  
</div>

  );
};

export default MessageBubble;