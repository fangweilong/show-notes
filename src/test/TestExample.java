package src.test;

public class TestExample {

    /**
     * 计算两个数字的和
     * 
     * @param a 第一个数字
     * @param b 第二个数字
     * @return 两个数字的和
     */
    public int add(int a, int b) {
        return a + b;
    }

    /**
     * 打印欢迎消息
     * 这个方法会在控制台输出欢迎信息
     */
    public void printWelcome() {
        System.out.println("Welcome!");
    }

    /**
     * 获取用户名称
     * 
     * @return 用户的名称字符串
     */
    public String getUserName() {
        return "User";
    }

    public void testMethod() {
        // 测试方法调用 - 应该显示Javadoc注释
        int result = add(5, 3);

        printWelcome();

        String name = getUserName();

        System.out.println(name);
    }
}