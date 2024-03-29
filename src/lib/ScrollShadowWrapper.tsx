// https://medium.com/dfind-consulting/react-scroll-hook-with-shadows-9ba2d47ae32
// https://github.com/Qovery/console/blob/staging/libs/shared/ui/src/lib/components/scroll-shadow-wrapper/scroll-shadow-wrapper.tsx
import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
  type WheelEvent,
  useEffect,
  useRef,
  useState,
} from "react";

export interface ScrollShadowWrapperProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function ScrollShadowWrapper(props: ScrollShadowWrapperProps) {
  const { children, className = "", style = {} } = props;

  const [scrollTop, setScrollTop] = useState(0);
  const [scrollHeight, setScrollHeight] = useState(0);
  const [clientHeight, setClientHeight] = useState(0);

  const onScrollHandler = (event: WheelEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
    setScrollHeight(event.currentTarget.scrollHeight);
    setClientHeight(event.currentTarget.clientHeight);
  };

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const resetRefSizes = (ref: RefObject<HTMLDivElement>) => {
      if (!ref.current) return;

      setScrollTop(ref.current.scrollTop);
      setScrollHeight(ref.current.scrollHeight);
      setClientHeight(ref.current.clientHeight);
    };

    resetRefSizes(wrapperRef);
  }, [wrapperRef?.current?.clientHeight]);

  // const getVisibleSides = (): { top: boolean; bottom: boolean } => {
  // added Math.floor()
  const isBottom =
    Math.floor(clientHeight) === Math.floor(scrollHeight - scrollTop);
  const isTop = scrollTop === 0;

  /*
    const isBetween = scrollTop > 0 && clientHeight < scrollHeight - scrollTop;
    console.log({ isTop, isBetween, isBottom });

    return {
      top: (isBottom || isBetween) && !(isTop && isBottom),
      bottom: (isTop || isBetween) && !(isTop && isBottom),
    };
  };
  */

  return (
    <div
      data-testid="scroll-shadow-wrapper"
      ref={wrapperRef}
      // style={style}
      // className={`relative overflow-y-auto pr-[1px] ${className}`}
      className={className}
      style={{
        position: "relative",
        overflowY: "auto",
        paddingRight: "1px",
        ...style,
      }}
      onScroll={onScrollHandler}
    >
      <div
        data-testid="scroll-shadow-top"
        //className={`sticky top-0 bg-scroll-shadow-up w-full h-4 -mb-4 pointer-events-none transition-opacity duration-300 ${
        //  getVisibleSides().top ? "opacity-100" : "opacity-0"
        //}`}
        style={{
          position: "sticky",
          top: 0,
          background: `radial-gradient(farthest-side at 50% 0, 
              rgba(0, 0, 0, 0.4),
              rgba(0, 0, 0, 0)
            ) center top`,
          height: 8,
          marginBottom: 0,
          transition: "opacity",
          transitionDuration: "300ms",
          // opacity: getVisibleSides().top ? 1 : 0,
          opacity: isTop ? 0 : 1,
          zIndex: 10,
        }}
      />
      {children}
      <div
        data-testid="scroll-shadow-bottom"
        // className={`sticky bottom-0 bg-scroll-shadow-bottom w-full h-4 -mt-4 pointer-events-none rotate-180 transition-opacity duration-300 ${
        //  getVisibleSides().bottom ? "opacity-100" : "opacity-0"
        //}`}
        style={{
          position: "sticky",
          bottom: 0,
          background: `radial-gradient(farthest-side at 50% 100%, 
            rgba(0, 0, 0, 0.4),
            rgba(0, 0, 0, 0)
          ) center bottom`,
          height: 8,
          marginTop: 4,
          transition: "opacity",
          transitionDuration: "300ms",
          // opacity: getVisibleSides().bottom ? 1 : 0,
          opacity: isBottom ? 0 : 1,
          zIndex: 10,
        }}
      />
    </div>
  );
}

export default ScrollShadowWrapper;
