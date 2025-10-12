import React from 'react';

const Loading = () => {
  return (
    <div className="
      fixed inset-0 z-50                       
      flex justify-center items-center          
               
    ">
      
      {/* The Spinner */}
      <div className="
        w-16 h-16
        rounded-full
        border-8 border-gray-300
        border-t-black
        animate-spin
      "></div>

    </div>
  );
};

export default Loading;