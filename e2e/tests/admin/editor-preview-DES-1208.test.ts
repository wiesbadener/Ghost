import {test, expect} from '../../helpers/playwright';
import {PostEditorPage} from '../../helpers/pages/admin';
import {createPostFactory} from '../../data-factory';
import type {PostFactory} from '../../data-factory';

/**
 * Linear Issue: DES-1208
 * Link: https://linear.app/ghost/issue/DES-1208
 *
 * Bug Description:
 * ESC doesn't work in post Preview modal once the focus is on the preview iframe.
 * When users open the post preview modal and focus moves to the preview iframe,
 * the ESC key stops functioning to close the modal.
 *
 * Steps to Reproduce:
 * 1. Open Ghost Admin
 * 2. Navigate to Posts and create/edit a post
 * 3. Click "Preview" button to open preview modal
 * 4. Click inside the preview iframe to focus it
 * 5. Press ESC key
 *
 * Expected: Modal should close when ESC is pressed
 * Actual: Nothing happens, modal remains open
 *
 * Technical Details:
 * - Browser security prevents keyboard events in iframes from bubbling to parent documents
 * - The escapePressHandler is defined but never attached to the document
 * - Original fix was reverted due to CORS security policy violations
 *
 * NOTE: This test intentionally FAILS to demonstrate the bug.
 * It will pass once the issue is fixed by properly attaching the escape handler.
 */
test.describe('DES-1208: ESC key not working in post preview modal', () => {
    let postFactory: PostFactory;

    test.beforeEach(async ({page}) => {
        postFactory = createPostFactory(page);
    });

    test('should close preview modal when ESC is pressed after clicking in iframe', async ({page}) => {
        // ARRANGE - Create a test post
        const testTitle = 'Test Post for ESC Key Bug';

        const post = await postFactory.create({
            title: testTitle,
            status: 'draft'
        });

        const postEditorPage = new PostEditorPage(page);

        // Navigate to the post editor
        await postEditorPage.gotoExistingPost(post.id);

        // ACT - Open preview modal
        await postEditorPage.openPreview();

        // Verify modal is open
        expect(await postEditorPage.previewModal.isVisible()).toBe(true);

        // Click inside the iframe to focus it (this is where the bug manifests)
        await postEditorPage.previewModal.clickInIframe();

        // Verify iframe has focus
        const iframeFocused = await postEditorPage.previewModal.isIframeFocused();
        expect(iframeFocused).toBe(true);

        // ASSERT - Test ESC key functionality
        // This is the core of the bug - ESC should close the modal but doesn't
        await postEditorPage.testEscapeKey();

        // Wait a moment for any potential modal close animation
        await page.waitForTimeout(500);

        // These assertions will FAIL due to the bug
        const modalStillVisible = await postEditorPage.previewModal.isVisible();
        expect(modalStillVisible).toBe(false); // FAILS: Modal remains open

        // Alternative check: if the modal is still visible, the bug is confirmed
        if (modalStillVisible) {
            // This should not happen in a working implementation
            console.log('🐛 BUG CONFIRMED: Modal remained open after ESC key press');

            // Clean up by closing manually for next tests
            await postEditorPage.previewModal.close();
        }
    });

    test('should close preview modal when ESC is pressed without iframe focus (baseline)', async ({page}) => {
        // This test verifies that ESC works when iframe is NOT focused
        // This should pass even with the current bug

        const testTitle = 'Baseline Test Post';
        const post = await postFactory.create({
            title: testTitle,
            status: 'draft'
        });

        const postEditorPage = new PostEditorPage(page);
        await postEditorPage.gotoExistingPost(post.id);

        // Open preview modal
        await postEditorPage.openPreview();
        expect(await postEditorPage.previewModal.isVisible()).toBe(true);

        // DO NOT click in iframe - keep focus outside iframe
        // Instead, click on the modal header to ensure focus is not on iframe
        await postEditorPage.previewModal.header.click();

        // Test ESC key - this should work
        await postEditorPage.testEscapeKey();

        // Wait a moment for modal close animation
        await page.waitForTimeout(500);

        // This should pass - ESC works when iframe doesn't have focus
        const modalClosed = await postEditorPage.previewModal.isVisible();
        expect(modalClosed).toBe(false);
    });

    test('should close preview modal using close button as fallback', async ({page}) => {
        // This test verifies the Close button works as an alternative

        const testTitle = 'Close Button Test Post';
        const post = await postFactory.create({
            title: testTitle,
            status: 'draft'
        });

        const postEditorPage = new PostEditorPage(page);
        await postEditorPage.gotoExistingPost(post.id);

        // Open preview modal
        await postEditorPage.openPreview();
        expect(await postEditorPage.previewModal.isVisible()).toBe(true);

        // Click in iframe to focus it
        await postEditorPage.previewModal.clickInIframe();

        // Verify iframe has focus
        const iframeFocused = await postEditorPage.previewModal.isIframeFocused();
        expect(iframeFocused).toBe(true);

        // Use close button instead of ESC
        await postEditorPage.previewModal.close();

        // This should always work
        const modalClosed = await postEditorPage.previewModal.isVisible();
        expect(modalClosed).toBe(false);
    });

    test('reproduces the exact bug scenario from Linear issue', async ({page}) => {
        // This test exactly reproduces the scenario described in the Linear issue

        const postEditorPage = new PostEditorPage(page);

        // Create a new post
        await postEditorPage.createNewPost(
            'ESC Key Bug Reproduction',
            'This test reproduces the exact bug where ESC key stops working when iframe has focus.'
        );

        // Wait for preview button to appear (happens after post is saved)
        await postEditorPage.waitForPreviewButtonVisible();

        // Open preview
        await postEditorPage.openPreview();

        // Modal should be visible
        expect(await postEditorPage.previewModal.isVisible()).toBe(true);

        // Click inside preview iframe (this is the critical step)
        await postEditorPage.previewModal.clickInIframe();

        // Try ESC key - this demonstrates the bug
        await postEditorPage.testEscapeKey();

        // Wait for any potential modal animations
        await page.waitForTimeout(1000);

        // The modal should be closed but it's not (demonstrating the bug)
        const modalVisible = await postEditorPage.previewModal.isVisible();

        // This assertion will FAIL, proving the bug exists
        expect(modalVisible).toBe(false); // FAILS: Modal is still visible

        // Log the bug for visibility
        console.log(`🐛 DES-1208 Bug Confirmed: Modal visible after ESC = ${modalVisible}`);

        // Clean up
        if (modalVisible) {
            await postEditorPage.previewModal.close();
        }
    });
});