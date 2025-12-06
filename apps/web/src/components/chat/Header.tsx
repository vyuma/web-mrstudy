import React from 'react';
import NavigationButton from '../navigation_buttun';
import BackIcon from '../icon/back';

const Header = () => (
  <div
    className="h-25 w-full bg-black flex flex-col z-50"
    style={{
      background: "#FDDE81",
      position: "fixed",
      top: 0,
      left: 0,
    }}
  >
    <div className="flex mt-10 items-center justify-between">
  <div className="w-1/3">
    <NavigationButton
      href="home"
      label=""
      variant="back"
      icon={<BackIcon />}
    />
  </div>
  <div className="w-1/3 flex justify-center">
    <p className="text-3xl text-white font-bold">Alice</p>
  </div>
  <div className="w-1/3">{/* 空白の右カラム */}</div>
</div>

  </div>
);

export default Header;
