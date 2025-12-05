import MessageItem from './message_Item';
import TypingIndicator from './TypingIndicator';

interface Message {
  id: number | null;
  text: string;
  sender: "alice" | "user";
  time: string;
  isRead: boolean | null;
}

interface MessageListProps {
  messages: Message[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  isTyping?: boolean;
}

const MessageList = ({ messages, messagesEndRef, isTyping = false }: MessageListProps) => (
  <div className="px-4 pb-20 space-y-3">
    {messages.map((message) => (
      <MessageItem key={message.id} message={message} />
    ))}
    {isTyping && (
      <div className="mt-3">
        <TypingIndicator isVisible={true} />
      </div>
    )}
    <div ref={messagesEndRef} />
  </div>
);

export default MessageList