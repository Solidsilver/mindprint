export const toast = $state({ msg: '', error: false, visible: false });

let timer: ReturnType<typeof setTimeout> | undefined;

export function showToast(msg: string, isError = false): void {
	toast.msg = msg;
	toast.error = isError;
	toast.visible = true;
	clearTimeout(timer);
	timer = setTimeout(() => (toast.visible = false), 3000);
}
