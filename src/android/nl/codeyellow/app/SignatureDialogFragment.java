/**
 * Dialog to present the user with a "pad" upon which to place their
 * signature and an OK/Cancel button to commit or discard their
 * signature.  Embeds SignatureView as the signature area.
 */
package nl.codeyellow.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.Dialog;
import android.app.DialogFragment;
import android.content.DialogInterface;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.PopupWindow;
import android.widget.RelativeLayout;
import java.lang.CharSequence;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import nl.codeyellow.view.SignatureView;
import org.apache.cordova.CallbackContext; // Ugh, but the alternatives are probably worse
import org.apache.cordova.PluginResult;

public class SignatureDialogFragment extends DialogFragment {
	protected CallbackContext callbackContext;
	protected CharSequence dialogTitle;
	
	public SignatureDialogFragment(CharSequence title, CallbackContext ctx) {
		dialogTitle = title;
		callbackContext = ctx;
	}
	
	@Override
	public Dialog onCreateDialog(Bundle savedInstanceState) {
		Activity act = getActivity();
		final SignatureView view = new SignatureView(act.getApplicationContext(), null);
		final CallbackContext ctx = callbackContext; // Silly Java

		return new AlertDialog.Builder(act)
			.setTitle(dialogTitle)
			.setView(view)
			.setPositiveButton(
				android.R.string.ok,
				new DialogInterface.OnClickListener() {
					@Override
					public void onClick(DialogInterface dialog, int which) {
						Bitmap bmp = view.getBitmap();
						// Maybe use getAllocationByteCount()+8?  It
						// was added in API level 19.
						int size = bmp.getWidth() * bmp.getHeight() * 4 + 8;
						ByteBuffer buf = ByteBuffer.allocate(size); // BIG_ENDIAN
						bmp.copyPixelsToBuffer(buf);
						// We can't put the metadata at the start because
						// copyPixelsToBuffer() ignores buf's position...
						buf.putInt(bmp.getWidth());
						buf.putInt(bmp.getHeight());
						ctx.success(buf.array());
						dialog.dismiss();
					}
				})
			.setNegativeButton(
				android.R.string.cancel,
				new DialogInterface.OnClickListener() {
					@Override
					public void onClick(DialogInterface dialog, int which) {
						// Signal that the user has exited, just in
						// case we want to perform some sort of action
						// on the JS side.
						ctx.success((String)null);
						dialog.cancel();
					}
				})
			.create();
	}
}