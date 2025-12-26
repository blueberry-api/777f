# 休假录入助手

import re
import platform
import os
from datetime import datetime
from colorama import init, Fore, Style
from playwright.sync_api import sync_playwright

init()  # 初始化colorama


def beep_error():
    """错误提示音"""
    try:
        if platform.system() == 'Windows':
            import winsound
            winsound.Beep(800, 300)
        else:
            os.system('paplay /usr/share/sounds/freedesktop/stereo/dialog-error.oga 2>/dev/null || true')
    except:
        pass

LEAVE_TYPE_MAP = {
    "ALV_FD-飞行员公休（订座）": "ALV_FD",
    "ALV-年假（公休假）": "ALV",
    "RECU_LVE-健康疗养": "RECU_LVE",
    "RECU_LVE_R-康复疗养": "RECU_LVE_R",
    "MAT_FA_LVE-陪产假": "MAT_FA_LVE",
    "PARENT_LVE-探亲假-探父母": "PARENT_LVE",
    "SPOUSE_LVE-探亲假-探配偶": "SPOUSE_LVE",
    "MARR_LVE-婚假": "MARR_LVE",
    "COMP_LVE-丧假": "COMP_LVE",
    "CHILD_LVE-育儿假": "CHILD_LVE",
}


def c_info(text):
    return f"{Fore.CYAN}{text}{Style.RESET_ALL}"

def c_ok(text):
    return f"{Fore.GREEN}{text}{Style.RESET_ALL}"

def c_err(text):
    return f"{Fore.RED}{text}{Style.RESET_ALL}"

def c_warn(text):
    return f"{Fore.YELLOW}{text}{Style.RESET_ALL}"

def c_hint(text):
    return f"{Fore.MAGENTA}{text}{Style.RESET_ALL}"


def parse_whitelist(text: str) -> set:
    """解析员工号白名单"""
    all_nums = re.findall(r'\d{6}', re.sub(r'\D', ' ', text))
    if all_nums:
        return set(all_nums)
    text = re.sub(r'\D', '', text)
    return set(text[i:i+6] for i in range(0, len(text), 6) if len(text[i:i+6]) == 6)


def normalize_date(date_str: str) -> str:
    """把各种日期格式统一转成YYYY-MM-DD"""
    parts = re.split(r'[-/]', date_str)
    if len(parts) == 3:
        year, month, day = parts
        return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
    return date_str


def parse_single_record(text: str) -> dict:
    """解析单条记录"""
    result = {"员工号": None, "姓名": None, "请假类型": None, "开始日期": None, "结束日期": None}
    emp = re.search(r'\b(\d{6})\b', text)
    if emp:
        result["员工号"] = emp.group(1)
    name = re.search(r'\d{6}\s*([\u4e00-\u9fa5]{2,4})', text)
    if name:
        result["姓名"] = name.group(1)
    for key, val in LEAVE_TYPE_MAP.items():
        if key in text:
            result["请假类型"] = val
            break
    dates = re.findall(r'\d{4}[-/]\d{1,2}[-/]\d{1,2}', text)
    if dates:
        result["开始日期"] = normalize_date(dates[0])
        result["结束日期"] = normalize_date(dates[1]) if len(dates) > 1 else normalize_date(dates[0])
    return result


def split_continuous_text(text: str) -> list:
    """把连续粘贴的文本按员工号切分成多条记录"""
    # 按6位员工号切分
    parts = re.split(r'(?=\d{6}[\u4e00-\u9fa5])', text)
    return [p.strip() for p in parts if p.strip() and re.search(r'\d{6}', p)]


def parse_batch_input(text: str, whitelist: set = None) -> tuple:
    """解析批量输入"""
    records = []
    errors = []
    # 先按换行分，如果只有一行且很长，尝试按员工号切分
    lines = [line.strip() for line in text.strip().split('\n') if line.strip()]
    if len(lines) == 1 and len(lines[0]) > 100:
        lines = split_continuous_text(lines[0])
    for i, line in enumerate(lines, 1):
        record = parse_single_record(line)
        if whitelist and record["员工号"] and record["员工号"] not in whitelist:
            continue
        if not record["员工号"]:
            errors.append(f"第{i}条: 未识别员工号 [{line[:50]}]")
            continue
        if not record["请假类型"]:
            errors.append(f"第{i}条: 未识别请假类型 [{line[:50]}]")
            continue
        if not record["开始日期"]:
            errors.append(f"第{i}条: 未识别日期 [{line[:50]}]")
            continue
        records.append(record)
    return records, errors


def clear_form(page):
    """清空表单"""
    page.locator("#showIdshowNonproductionTaskImportPage").fill("")
    page.locator("#lockStartTime").fill("")
    page.locator("#lockEndTime").fill("")
    page.wait_for_timeout(300)


def fill_form(page, emp_id, leave_type, start_date, end_date):
    """填写表单"""
    clear_form(page)
    emp_input = page.locator("#showIdshowNonproductionTaskImportPage")
    emp_input.click()
    page.wait_for_timeout(300)
    emp_input.fill("")
    emp_input.type(str(emp_id), delay=50)
    page.wait_for_timeout(500)
    page.evaluate("""
        const input = document.querySelector('#showIdshowNonproductionTaskImportPage');
        if (input) {
            input.dispatchEvent(new Event('blur', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    """)
    page.wait_for_timeout(1000)
    # 用JS直接设置下拉框值并触发事件
    page.evaluate("""(leaveType) => {
        const select = document.querySelector('#lockType');
        if (select) {
            select.focus();
            select.value = leaveType;
            select.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            select.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            select.dispatchEvent(new Event('input', { bubbles: true }));
            select.dispatchEvent(new Event('change', { bubbles: true }));
            select.dispatchEvent(new Event('blur', { bubbles: true }));
        }
    }""", leave_type)
    page.wait_for_timeout(1000)
    page.locator("#lockStartTime").click()
    page.wait_for_timeout(200)
    page.locator("#lockStartTime").fill(start_date)
    page.locator("#lockEndTime").click()
    page.wait_for_timeout(200)
    page.locator("#lockEndTime").fill(end_date)
    page.wait_for_timeout(300)


def submit_and_check(page):
    """提交并检查冲突,返回(成功, 冲突信息)"""
    # 点击下一步
    page.get_by_role("button", name="下一步").wait_for()
    page.get_by_role("button", name="下一步").click()
    # 等待继续录入按钮出现,说明页面加载完成
    page.get_by_role("button", name="继续录入").wait_for()
    # 检查查询结果是否有数据
    result_rows = page.locator("#showNonproductionTaskImportResultPage1 tbody.list tr")
    # 检查冲突列表的内容
    conflict_rows = page.locator("#showNonproductionTaskImportResultPage2 tbody.list tr")
    # 获取冲突列表的文本内容
    conflict_text = ""
    if conflict_rows.count() > 0:
        conflict_text = conflict_rows.first.inner_text()
    # 成功条件: 查询结果有数据 且 冲突列表显示"没有相关信息"
    if result_rows.count() > 0 and "没有相关信息" in conflict_text:
        # 没有冲突,点击继续录入
        page.get_by_role("button", name="继续录入").click()
        # 等待表单页面加载
        page.locator("#showIdshowNonproductionTaskImportPage").wait_for()
        return True, None
    else:
        # 有冲突或查询结果为空
        if result_rows.count() == 0:
            conflict_info = "查询结果为空"
        else:
            conflict_info = conflict_text
        return False, conflict_info


def whitelist_status(whitelist):
    """返回白名单状态文字"""
    if whitelist:
        return c_ok(f"白名单:{len(whitelist)}人")
    return c_warn("白名单:无")


def read_multiline(prompt, confirm_key='ok', cancel_key='c'):
    """读取多行输入,输入confirm_key确认,cancel_key取消"""
    print(prompt)
    lines = []
    while True:
        line = input()
        if line.lower() == cancel_key:
            return None
        if line.lower() == confirm_key:
            break
        if line:
            lines.append(line)
    if not lines:
        return None
    return '\n'.join(lines)


def set_whitelist():
    """设置白名单"""
    text = read_multiline(c_hint("请粘贴员工号列表(输入ok确认,c取消):"), 'ok', 'c')
    if text is None:
        print(c_warn("已取消"))
        return None
    wl = parse_whitelist(text)
    if not wl:
        print(c_err("未识别到有效员工号"))
        return None
    print(c_ok(f"已设置白名单,共{len(wl)}人"))
    return wl


def format_record(r):
    """格式化记录显示"""
    name = r['姓名'] or '未知'
    return f"{r['员工号']} {name} {r['请假类型']} {r['开始日期']}~{r['结束日期']}"


def go_back_to_form(page):
    """从结果页返回表单页"""
    try:
        page.get_by_role("button", name="继续录入").click()
        page.locator("#showIdshowNonproductionTaskImportPage").wait_for()
    except Exception:
        pass  # 如果已经在表单页就忽略


def print_failed_records(failed_records):
    """打印失败记录并写入日志文件"""
    if failed_records:
        print(c_err(f"本次失败{len(failed_records)}条:"))
        for r, reason in failed_records:
            print(c_err(f"  {format_record(r)} - {reason}"))
        # 写入日志文件
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"failed_{timestamp}.txt"
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(f"失败记录 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"共{len(failed_records)}条\n")
                f.write("-" * 50 + "\n")
                for r, reason in failed_records:
                    f.write(f"{format_record(r)} - {reason}\n")
            filepath = os.path.abspath(filename)
            print(c_warn(f"失败记录已保存: {filepath}"))
        except Exception as e:
            print(c_warn(f"保存日志失败: {e}"))


def batch_mode(page, whitelist):
    """批量模式"""
    failed_records = []  # 记录失败的条目
    while True:
        print(f"{c_info('[批量模式]')} {whitelist_status(whitelist)}")
        text = read_multiline(c_hint("请粘贴数据(输入ok确认,b返回):"), 'ok', 'b')
        if text is None:
            print_failed_records(failed_records)
            return
        records, errors = parse_batch_input(text, whitelist)
        if errors:
            print(c_err("解析错误:"))
            for err in errors:
                print(c_err(err))
        if not records:
            print(c_err("没有可处理的记录"))
            continue
        print(c_ok(f"共{len(records)}条有效数据:"))
        for i, r in enumerate(records, 1):
            print(f"{i}. {format_record(r)}")
        confirm = input(c_hint("y开始填写,n重新粘贴,b返回主菜单: ")).strip().lower()
        if confirm == 'b':
            return
        if confirm != 'y':
            continue
        i = 0
        while i < len(records):
            record = records[i]
            print(f"{c_info(f'[{i+1}/{len(records)}]')} 填写: {format_record(record)}")
            try:
                fill_form(page, record["员工号"], record["请假类型"], record["开始日期"], record["结束日期"])
                print(c_ok("填表完成,提交中..."))
                success, conflict_info = submit_and_check(page)
                if success:
                    print(c_ok("提交成功"))
                else:
                    beep_error()
                    print(c_err("有冲突!"))
                    print(c_warn(conflict_info if conflict_info else "未知冲突"))
                    while True:
                        cmd = input(c_hint("s跳过,r重试,b返回主菜单: ")).strip().lower()
                        if cmd == 'b':
                            failed_records.append((record, "有冲突"))
                            go_back_to_form(page)
                            print_failed_records(failed_records)
                            return
                        if cmd == 'r':
                            go_back_to_form(page)
                            break  # 跳出内层while，外层while会重试当前记录
                        if cmd == 's':
                            failed_records.append((record, "有冲突"))
                            go_back_to_form(page)
                            i += 1
                            break  # 跳出内层while，继续下一条
                        print(c_warn("无效输入，请输入s/r/b"))
                    if cmd == 'r':
                        continue  # 重试当前记录，不执行i+=1
                    if cmd == 's' or cmd == 'b':
                        continue  # 已经处理过了，跳过下面的i+=1
            except Exception as e:
                beep_error()
                print(c_err(f"失败: {e}"))
                while True:
                    cmd = input(c_hint("s跳过,r重试,b返回主菜单: ")).strip().lower()
                    if cmd == 'b':
                        failed_records.append((record, str(e)))
                        print_failed_records(failed_records)
                        return
                    if cmd == 'r':
                        break  # 重试
                    if cmd == 's':
                        failed_records.append((record, str(e)))
                        i += 1
                        break
                    print(c_warn("无效输入，请输入s/r/b"))
                if cmd == 'r':
                    continue
                if cmd == 's':
                    continue
            i += 1
        print(c_ok("批量处理完成"))
        print_failed_records(failed_records)
        return


def manual_mode(page, whitelist):
    """手动模式"""
    while True:
        print(f"{c_info('[手动模式]')} {whitelist_status(whitelist)} | {c_hint('粘贴数据,b返回主菜单:')}")
        text = input().strip()
        if text.lower() == 'b':
            return
        if not text:
            continue
        record = parse_single_record(text)
        if whitelist and record["员工号"] and record["员工号"] not in whitelist:
            print(c_err("该员工不在白名单中"))
            continue
        if not record["员工号"]:
            print(c_err("未识别员工号"))
            continue
        if not record["请假类型"]:
            print(c_err("未识别请假类型"))
            continue
        if not record["开始日期"]:
            print(c_err("未识别日期"))
            continue
        while True:
            print(f"填写: {format_record(record)}")
            try:
                fill_form(page, record["员工号"], record["请假类型"], record["开始日期"], record["结束日期"])
                print(c_ok("填表完成,提交中..."))
                success, conflict_info = submit_and_check(page)
                if success:
                    print(c_ok("提交成功"))
                    break
                else:
                    print(c_err("有冲突!"))
                    print(c_warn(conflict_info if conflict_info else "未知冲突"))
                    while True:
                        cmd = input(c_hint("s跳过,r重试,b返回主菜单: ")).strip().lower()
                        if cmd == 'b':
                            go_back_to_form(page)
                            return
                        if cmd == 'r':
                            go_back_to_form(page)
                            break  # 跳出内层while，重试
                        if cmd == 's':
                            go_back_to_form(page)
                            break  # 跳出内层while，跳过
                        print(c_warn("无效输入，请输入s/r/b"))
                    if cmd == 'r':
                        continue  # 重试当前记录
                    if cmd == 's':
                        break  # 跳过，回到外层等待新输入
            except Exception as e:
                beep_error()
                print(c_err(f"失败: {e}"))
                while True:
                    cmd = input(c_hint("r重试,b返回主菜单: ")).strip().lower()
                    if cmd == 'b':
                        return
                    if cmd == 'r':
                        break
                    print(c_warn("无效输入，请输入r/b"))
                if cmd == 'r':
                    continue
                break


def main():
    print(c_info("休假录入助手"))
    # 浏览器路径
    browser_path = input(c_hint("浏览器路径(回车用默认): ")).strip() or None
    if browser_path:
        print(c_ok(f"使用指定浏览器: {browser_path}"))
    else:
        print(c_ok("使用默认浏览器"))
    # 白名单
    whitelist = None
    use_wl = input(c_hint("是否预设白名单?(y/n): ")).strip().lower()
    if use_wl == 'y':
        whitelist = set_whitelist()
    else:
        print(c_ok("不设置白名单,处理所有员工"))
    pw = sync_playwright().start()
    browser = pw.chromium.launch(headless=False, executable_path=browser_path)
    context = browser.new_context()
    context.set_default_timeout(0)  # 全局无超时限制
    page = context.new_page()
    # 登录
    try:
        page.goto("https://ieb.csair.com/login")
        page.wait_for_load_state("networkidle")
        page.locator("#scanLogin").wait_for()
        page.locator("#scanLogin").click()
        print(c_info("请扫码登录..."))
        page.wait_for_url("**/index/**")
        page.wait_for_load_state("networkidle")
        print(c_ok("登录成功"))
    except Exception as e:
        print(c_err(f"自动登录失败: {e}"))
        print(c_warn("请手动完成登录"))
        input(c_hint("登录完成后按回车继续..."))
    # 导航到非生产任务录入页面
    try:
        print(c_info("正在进入非生产任务录入页面..."))
        page.goto("https://ieb.csair.com/index/index")
        page.wait_for_load_state("networkidle")
        page.get_by_text("运行管理").nth(1).wait_for()
        page.get_by_text("运行管理").nth(1).click()
        page.get_by_role("link", name="非生产任务").wait_for()
        page.get_by_role("link", name="非生产任务").click()
        page.get_by_role("link", name="非生产任务录入").wait_for()
        page.get_by_role("link", name="非生产任务录入").click()
        page.locator("#mainContent").wait_for()
        page.locator("#mainContent").click()
        page.wait_for_load_state("networkidle")
        print(c_ok("已进入非生产任务录入页面"))
    except Exception as e:
        print(c_err(f"自动导航失败: {e}"))
        print(c_warn("请手动进入非生产任务录入页面"))
        input(c_hint("准备好后按回车继续..."))
    print(c_ok("开始工作"))
    while True:
        print(f"{whitelist_status(whitelist)} | {c_hint('1批量 2手动 w设白名单 c清白名单 q退出')}")
        cmd = input(c_hint("选择: ")).strip().lower()
        if cmd == '1':
            batch_mode(page, whitelist)
        elif cmd == '2':
            manual_mode(page, whitelist)
        elif cmd == 'w':
            new_wl = set_whitelist()
            if new_wl is not None:
                whitelist = new_wl
        elif cmd == 'c':
            whitelist = None
            print(c_ok("已清除白名单"))
        elif cmd == 'q':
            break
    browser.close()
    pw.stop()
    print(c_info("结束"))


if __name__ == "__main__":
    main()
