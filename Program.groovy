def reader = System.in.newReader()
def count = Integer.parseInt(reader.readLine().trim())
def numbers = []
for (int i = 0; i < count; i++) {
    numbers << Integer.parseInt(reader.readLine().trim())
}
def limit
do {
    println 'Введите порог (больше 0):'
    limit = Integer.parseInt(reader.readLine().trim())
} while (limit <= 0)
def sum = 0
def above = 0
def negative = 0
for (n in numbers) {
    sum += n
    if (n > limit) {
        above++
    } else if (n < 0) {
        negative++
    }
}
def index = 0
while (index < count && numbers[index] >= 0) {
    index++
}
println 'Команда (sum, above, negative, first):'
def command = reader.readLine().trim()
switch (command) {
    case 'sum':
        println sum
        break
    case 'above':
        println above
        break
    case 'negative':
        println negative
        break
    case 'first':
        if (index < count) {
            println index
        } else {
            println 'Отрицательных чисел нет'
        }
        break
    default:
        println 'Неизвестная команда'
}
