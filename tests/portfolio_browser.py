"""Smoke test the static gallery in Chromium. Run with Playwright installed."""
from pathlib import Path
import os
import re

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ENTRY = (Path(os.environ.get("PORTFOLIO_ROOT", ROOT)) / "index.html").resolve()
GROUPS = ["AI coding", "AI 工作流", "产品 PPT"]


def verify():
    assert ENTRY.is_file(), "The standalone gallery entry point is missing"
    with sync_playwright() as playwright:
        launch = {"headless": True}
        if chrome := os.environ.get("PORTFOLIO_CHROME"):
            launch["executable_path"] = chrome
        with playwright.chromium.launch(**launch) as browser:
            desktop = browser.new_page(viewport={"width": 1440, "height": 900})
            errors = []
            desktop.on("pageerror", lambda error: errors.append(str(error)))
            desktop.clock.install()
            desktop.goto(ENTRY.as_uri())
            expect(desktop.get_by_role("heading", name="张德海能力展示卡")).to_be_visible()
            for group in GROUPS:
                expect(desktop.get_by_role("button", name=group, exact=True)).to_be_visible()

            title = desktop.locator("#slide-title")
            current = desktop.locator("#slide-position")
            next_button = desktop.locator("#next-slide")
            previous = desktop.locator("#prev-slide")
            expect(title).to_have_text(re.compile("XAJ"))
            expect(current).to_have_text("1 / 2")

            duration = """(milliseconds) => document.querySelector('#progress-bar').getAnimations()
                .some(animation => animation.effect.getTiming().duration === milliseconds)"""
            desktop.wait_for_function(duration, arg=2500, timeout=2000)
            desktop.clock.run_for(2550)
            expect(title).to_have_text(re.compile("HydroLab"))
            expect(current).to_have_text("2 / 2")
            desktop.wait_for_function("""() => [...document.querySelectorAll('#frame img')].some(
                image => image.currentSrc.endsWith('/hydrolab-animation.webp')
                    && image.complete && image.naturalWidth > 0
                    && getComputedStyle(image).visibility === 'visible')""", timeout=2000)
            desktop.wait_for_function(duration, arg=4000, timeout=2000)
            desktop.clock.run_for(4050)
            expect(desktop.get_by_role("button", name="AI 工作流", exact=True)).to_have_attribute("aria-current", "true")
            expect(current).to_have_text("1 / 3")

            desktop.locator("#toggle-playback").click()
            desktop.clock.run_for(4500)
            expect(current).to_have_text("1 / 3")
            previous.click()
            expect(title).to_have_text(re.compile("HydroLab"))
            desktop.locator("#expand-artwork").click()
            expect(desktop.locator("#viewer-image")).to_have_attribute("src", re.compile(r"/hydrolab\.gif$"))
            desktop.wait_for_function("""() => {
                const image = document.querySelector('#viewer-image');
                return image.complete && image.naturalWidth === 1120;
            }""")
            desktop.locator("#viewer-close").click()
            next_button.click()
            expect(title).to_have_text(re.compile("迭代"))

            desktop.get_by_role("button", name="产品 PPT", exact=True).click()
            expect(title).to_have_text("产品技术框架")
            for _ in range(5):
                next_button.click()
            expect(title).to_have_text(re.compile("XAJ"))
            expect(desktop.get_by_role("button", name="AI coding", exact=True)).to_have_attribute("aria-current", "true")

            desktop.locator("#expand-artwork").click()
            expect(desktop.locator("#viewer")).to_be_visible()
            expect(desktop.locator("#viewer-image")).to_have_js_property("complete", True)
            assert desktop.locator("#viewer-image").evaluate("(image) => image.naturalWidth > 0")
            desktop.locator("#viewer-alternate").click()
            expect(desktop.locator("#viewer-title")).to_have_text("XAJ 洪水预报结果")
            desktop.keyboard.press("Escape")
            expect(desktop.locator("#viewer")).to_be_hidden()
            assert not errors, errors

            mobile = browser.new_page(
                viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True,
                device_scale_factor=2, reduced_motion="reduce",
            )
            mobile.goto(ENTRY.as_uri())
            expect(mobile.locator("#toggle-playback")).to_have_attribute("aria-label", "开始自动播放")
            expect(mobile.locator("#slide-title")).to_have_text(re.compile("XAJ"))
            assert mobile.evaluate("document.documentElement.scrollWidth === innerWidth")
            assert mobile.evaluate("getComputedStyle(document.documentElement).colorScheme === 'light'")
            heading = mobile.get_by_role("heading", name="张德海能力展示卡")
            assert heading.evaluate("(el) => parseFloat(getComputedStyle(el).letterSpacing) > 0")
            mobile.set_viewport_size({"width": 320, "height": 720})
            assert mobile.evaluate("document.documentElement.scrollWidth === innerWidth")
            assert heading.evaluate("(el) => el.offsetHeight <= Math.ceil(parseFloat(getComputedStyle(el).lineHeight))")
            mobile.set_viewport_size({"width": 390, "height": 844})
            expect(mobile.locator("#expand-artwork img").first).to_be_visible()
            mobile.locator("#next-slide").click()
            expect(mobile.locator("#frame img").last).to_have_attribute("src", re.compile(r"/hydrolab-poster\.webp$"))
            mobile.get_by_role("button", name="AI 工作流", exact=True).click()
            expect(mobile.locator("#slide-title")).to_have_text(re.compile("迭代"))
            assert mobile.evaluate("document.documentElement.scrollWidth === innerWidth")
            artwork = mobile.locator("#expand-artwork")
            artwork.dispatch_event("pointerdown", {"pointerType": "touch", "clientX": 281, "clientY": 218})
            artwork.dispatch_event("pointerup", {"pointerType": "touch", "clientX": 93, "clientY": 221})
            expect(mobile.locator("#slide-title")).to_have_text(re.compile("协作图谱"))
            expect(mobile.locator("#viewer")).to_be_hidden()
    print("Portfolio desktop, autoplay, category wrap, viewer, and mobile checks passed.")


if __name__ == "__main__":
    verify()
