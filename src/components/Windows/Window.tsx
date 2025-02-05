import React, { useMemo, useRef, useState } from "react";
import { faTimesCircle, faWindowMaximize } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import styled from "styled-components";
import Tab from "./Tab";
import { pluralize } from "../../utils/helper";
import { useSelector } from "../../hooks/useSelector";
import { useDispatch } from "../../hooks/useDispatch";
import { Draggable, DraggableProvidedDragHandleProps, DraggableStateSnapshot, Droppable } from "react-beautiful-dnd";
import { isTabDrag } from "../../constants/dragRegExp";
import { CloseIcon } from "../../styles/CloseIcon";
import GROUPS_CREATORS from "../../store/actions/groups";
import useClickOutside from "../../hooks/useClickOutside";

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Row = styled(Column)`
  flex-direction: row;
  align-items: center;
`;

const WindowContainer = styled(Column)<{ $dragging: boolean }>`
  justify-content: center;
  font-size: 14px;
  border-radius: 4px;
  padding: 0 ${({ $dragging }) => ($dragging ? "4px" : "initial")};
`;

const WindowTitle = styled.div`
  font-size: 15px;
  width: fit-content;
  cursor: pointer;
`;

const Headline = styled(Column)<{ $active: boolean; $dragging: boolean }>`
  display: grid;
  grid-template-columns: auto 25ch auto;
  column-gap: 8px;
  justify-content: start;
  align-items: center;
  background-color: white;
  border-radius: 4px;
  border: 1px dashed ${({ $dragging }) => ($dragging ? "grey" : "initial")};

  & svg,
  & ${WindowTitle} {
    color: ${({ $active }) => ($active ? "#0080ff" : "")};
  }
`;

const TabsContainer = styled(Column)<{ $draggedOver: boolean; $dragOrigin: boolean }>`
  margin-left: 24px;
  border-radius: 4px;
  border: 1px dashed ${({ $draggedOver }) => ($draggedOver ? "#0080ff" : "transparent")};
  background-color: ${({ $dragOrigin }) => ($dragOrigin ? "#f5faff" : "white")};
`;

const TabCounter = styled.span`
  color: #808080;
  cursor: default;
`;

const Popup = styled.div<{ $left: number }>`
  position: absolute;
  top: 0;
  left: ${({ $left }) => $left + 10 + "px"};
  background-color: #303030;
  display: flex;
  flex-direction: column;
  min-width: 175px;
  padding: 4px;

  &::before {
    position: absolute;
    top: 4px;
    right: 100%;
    content: "";
    border: 6px solid transparent;
    border-right: 6px solid #303030;
  }
`;

const PopupChoice = styled.button`
  background: inherit;
  cursor: pointer;
  padding: 12px 8px;
  border: none;
  outline: none;
  text-align: left;
  color: white;

  &:hover {
    background-color: #42a4ff;
  }
`;

const TitleContainer = styled.div`
  position: relative;
`;

type TOpenWindow = "new" | "current" | "incognito";

const WINDOW_TITLE_POPUP_CHOICES: { type: TOpenWindow; text: string }[] = [
  { type: "current", text: "Open In Current" },
  { type: "new", text: "Open In New" },
  { type: "incognito", text: "Open Incognito" }
];

export default function Window({
  focused,
  tabs,
  incognito,
  id: windowId,
  windowIndex,
  snapshot: windowSnapshot,
  dragHandleProps
}: chrome.windows.Window & {
  windowIndex: number;
  snapshot: DraggableStateSnapshot;
  dragHandleProps: DraggableProvidedDragHandleProps | undefined;
}): JSX.Element {
  const dispatch = useDispatch();

  const {
    active: { index: groupIndex }
  } = useSelector((state) => state.groups);
  const { typing, filterChoice } = useSelector((state) => state.header);
  const { filteredTabs } = useSelector((state) => state.filter);
  const { dragType, isDragging } = useSelector((state) => state.dnd);

  const currentTabs = typing ? filteredTabs[windowIndex] : tabs;

  const titleRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  useClickOutside<HTMLDivElement>({
    ref: popupRef,
    preCondition: showPopup,
    cb: () => setShowPopup(false)
  });

  const openWindow = (type: TOpenWindow) => {
    const isIncognito = type === "incognito" || incognito;

    (["new", "incognito"] as TOpenWindow[]).includes(type)
      ? chrome.windows.create({
          focused: true,
          ...(!isIncognito ? { state: "maximized" } : {}),
          type: "normal",
          incognito: isIncognito,
          url: currentTabs?.map((tab) => tab.url ?? "https://www.google.com")
        })
      : currentTabs?.forEach((tab) => {
          const { active, pinned, url } = tab ?? {};
          chrome.tabs.create({ active, pinned, url });
        });
  };

  const closeWindow = () => {
    if (groupIndex > 0) {
      dispatch(GROUPS_CREATORS.closeWindow({ groupIndex, windowIndex }));

      // possible to have deleted the last window in the group
      dispatch(GROUPS_CREATORS.clearEmptyGroups());
    } else {
      windowId && chrome.windows.remove(windowId);
    }
  };

  const tabCounterStr = useMemo(() => {
    const totalTabs = tabs?.length ?? 0;
    const numVisibleTabs = typing ? filteredTabs[windowIndex]?.length ?? 0 : totalTabs;
    const count = filterChoice === "tab" ? numVisibleTabs : totalTabs;

    return `${count}${typing ? ` of ${totalTabs}` : ""} ${pluralize(totalTabs, "Tab")}`;
  }, [typing, filteredTabs, tabs?.length, filterChoice, windowIndex]);

  return (
    <WindowContainer $dragging={windowSnapshot.isDragging}>
      <Row>
        <CloseIcon
          icon={faTimesCircle}
          tabIndex={0}
          onClick={closeWindow}
          onKeyPress={({ key }) => key === "Enter" && closeWindow()}
          $visible={!isDragging}
        />

        <Headline $active={focused} $dragging={windowSnapshot.isDragging}>
          <div {...dragHandleProps}>
            <FontAwesomeIcon icon={faWindowMaximize} />
          </div>

          <TitleContainer>
            <WindowTitle
              ref={titleRef}
              tabIndex={0}
              role="button"
              onClick={({ button }) => button === 0 && openWindow("new")}
              onContextMenu={(e) => {
                e.preventDefault();
                setShowPopup(true);
              }}
              onKeyPress={({ key }) => key === "Enter" && setShowPopup(true)}
            >
              {focused ? "Current" : ""} Window
            </WindowTitle>

            {showPopup && (
              <Popup ref={popupRef} $left={titleRef.current?.clientWidth ?? 0}>
                {WINDOW_TITLE_POPUP_CHOICES.map((choice) => (
                  <PopupChoice
                    key={choice.text}
                    tabIndex={0}
                    onClick={() => openWindow(choice.type)}
                    onKeyPress={({ key }) => key === "Enter" && openWindow(choice.type)}
                  >
                    {choice.text}
                  </PopupChoice>
                ))}
              </Popup>
            )}
          </TitleContainer>

          <TabCounter>{tabCounterStr}</TabCounter>
        </Headline>
      </Row>

      <Droppable droppableId={"window-" + windowIndex} isDropDisabled={!isTabDrag(dragType)}>
        {(provider, dropSnapshot) => (
          <TabsContainer
            ref={provider.innerRef}
            {...provider.droppableProps}
            $draggedOver={dropSnapshot.isDraggingOver}
            $dragOrigin={!!dropSnapshot.draggingFromThisWith}
          >
            {currentTabs?.map((tab, i) => {
              const { title, url, pendingUrl } = tab ?? {};
              const tabUrl = url ?? pendingUrl;
              if (title && tabUrl) {
                return (
                  <Draggable key={title + tabUrl + i} draggableId={`tab-${i}-window-${windowIndex}`} index={i}>
                    {(provided, dragSnapshot) => (
                      <div ref={provided.innerRef} {...provided.draggableProps}>
                        <Tab
                          {...tab}
                          tabIndex={i}
                          windowIndex={windowIndex}
                          snapshot={dragSnapshot}
                          dragHandleProps={provided.dragHandleProps}
                        />
                      </div>
                    )}
                  </Draggable>
                );
              }
            })}

            {provider.placeholder}
          </TabsContainer>
        )}
      </Droppable>
    </WindowContainer>
  );
}
