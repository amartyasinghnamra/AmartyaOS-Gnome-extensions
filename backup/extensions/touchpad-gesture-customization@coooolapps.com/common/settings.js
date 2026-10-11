export var PinchGestureType;

(function (PinchGestureType) {
    PinchGestureType[PinchGestureType["NONE"] = 0] = "NONE";
    PinchGestureType[PinchGestureType["SHOW_DESKTOP"] = 1] = "SHOW_DESKTOP";
    PinchGestureType[PinchGestureType["OPEN_CLOSE_WINDOW"] = 2] = "OPEN_CLOSE_WINDOW";
    PinchGestureType[PinchGestureType["OPEN_CLOSE_DOCUMENT"] = 3] = "OPEN_CLOSE_DOCUMENT";
    PinchGestureType[PinchGestureType["SHOW_NOTIFICATION_LIST"] = 4] = "SHOW_NOTIFICATION_LIST";
    PinchGestureType[PinchGestureType["VOLUME_CONTROL"] = 5] = "VOLUME_CONTROL";
    PinchGestureType[PinchGestureType["KEYBOARD_BACKLIGHT_CONTROL"] = 6] = "KEYBOARD_BACKLIGHT_CONTROL";
})(PinchGestureType || (PinchGestureType = {}));

export var VerticalSwipeGestureType;

(function (VerticalSwipeGestureType) {
    VerticalSwipeGestureType[VerticalSwipeGestureType["NONE"] = 0] = "NONE";
    VerticalSwipeGestureType[VerticalSwipeGestureType["OVERVIEW_NAVIGATION"] = 1] = "OVERVIEW_NAVIGATION";
    VerticalSwipeGestureType[VerticalSwipeGestureType["WORKSPACE_SWITCHING"] = 2] = "WORKSPACE_SWITCHING";
    VerticalSwipeGestureType[VerticalSwipeGestureType["WINDOW_SWITCHING"] = 3] = "WINDOW_SWITCHING";
    VerticalSwipeGestureType[VerticalSwipeGestureType["VOLUME_CONTROL"] = 4] = "VOLUME_CONTROL";
    VerticalSwipeGestureType[VerticalSwipeGestureType["BRIGHTNESS_CONTROL"] = 5] = "BRIGHTNESS_CONTROL";
    VerticalSwipeGestureType[VerticalSwipeGestureType["WINDOW_MANIPULATION"] = 6] = "WINDOW_MANIPULATION";
    VerticalSwipeGestureType[VerticalSwipeGestureType["MEDIA_CONTROL"] = 7] = "MEDIA_CONTROL";
})(VerticalSwipeGestureType || (VerticalSwipeGestureType = {}));

export var HorizontalSwipeGestureType;

(function (HorizontalSwipeGestureType) {
    HorizontalSwipeGestureType[HorizontalSwipeGestureType["NONE"] = 0] = "NONE";
    HorizontalSwipeGestureType[HorizontalSwipeGestureType["OVERVIEW_NAVIGATION"] = 1] = "OVERVIEW_NAVIGATION";
    HorizontalSwipeGestureType[HorizontalSwipeGestureType["WORKSPACE_SWITCHING"] = 2] = "WORKSPACE_SWITCHING";
    HorizontalSwipeGestureType[HorizontalSwipeGestureType["WINDOW_SWITCHING"] = 3] = "WINDOW_SWITCHING";
    HorizontalSwipeGestureType[HorizontalSwipeGestureType["VOLUME_CONTROL"] = 4] = "VOLUME_CONTROL";
    HorizontalSwipeGestureType[HorizontalSwipeGestureType["BRIGHTNESS_CONTROL"] = 5] = "BRIGHTNESS_CONTROL";
    HorizontalSwipeGestureType[HorizontalSwipeGestureType["MEDIA_CONTROL"] = 6] = "MEDIA_CONTROL";
})(HorizontalSwipeGestureType || (HorizontalSwipeGestureType = {}));

export var OverviewNavigationState;

(function (OverviewNavigationState) {
    OverviewNavigationState[OverviewNavigationState["CYCLIC"] = 0] = "CYCLIC";
    OverviewNavigationState[OverviewNavigationState["GNOME"] = 1] = "GNOME";
    OverviewNavigationState[OverviewNavigationState["WINDOW_PICKER_ONLY"] = 2] = "WINDOW_PICKER_ONLY";
})(OverviewNavigationState || (OverviewNavigationState = {}));

export var WorkspaceSwitchingState;

(function (WorkspaceSwitchingState) {
    WorkspaceSwitchingState[WorkspaceSwitchingState["DEFAULT"] = 0] = "DEFAULT";
    WorkspaceSwitchingState[WorkspaceSwitchingState["CYCLIC"] = 1] = "CYCLIC";
})(WorkspaceSwitchingState || (WorkspaceSwitchingState = {}));

export var ForwardBackKeyBinds;

(function (ForwardBackKeyBinds) {
    ForwardBackKeyBinds[ForwardBackKeyBinds["Default"] = 0] = "Default";
    ForwardBackKeyBinds[ForwardBackKeyBinds["Forward/Backward"] = 1] = "Forward/Backward";
    ForwardBackKeyBinds[ForwardBackKeyBinds["Page Up/Down"] = 2] = "Page Up/Down";
    ForwardBackKeyBinds[ForwardBackKeyBinds["Right/Left"] = 3] = "Right/Left";
    ForwardBackKeyBinds[ForwardBackKeyBinds["Audio Next/Prev"] = 4] = "Audio Next/Prev";
    ForwardBackKeyBinds[ForwardBackKeyBinds["Tab Next/Prev"] = 5] = "Tab Next/Prev";
})(ForwardBackKeyBinds || (ForwardBackKeyBinds = {}));
