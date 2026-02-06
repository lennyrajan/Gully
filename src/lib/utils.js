export const getDeviceId = () => {
    if (typeof window === 'undefined') return null;
    let id = localStorage.getItem('gully_device_id');
    if (!id) {
        id = `dev_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
        localStorage.setItem('gully_device_id', id);
    }
    return id;
};
