type Props = {
    date?: string | Date;
  };
  
  export default function DateIndicator({ date }: Props) {
    const formatDateLabel = (dateInput: string | Date | undefined): string => {
      const target = dateInput ? new Date(dateInput) : new Date();
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
  
      // 年月日だけ比較（時分秒は無視）
      const isSameDay = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
  
      if (isSameDay(target, today)) {
        return "今日";
      } else if (isSameDay(target, yesterday)) {
        return "昨日";
      } else {
        return `${target.getFullYear()}/${target.getMonth() + 1}/${target.getDate()}`;
      }
    };
  
    return (
      <div className="text-center py-2" >
        <span className="bg-white bg-opacity-50 px-3 py-1  rounded-full text-sm "style={{color:'#876934'}}>
          {formatDateLabel(date)}
        </span>
      </div>
    );
  }
  