const values = [
	"Tacos",
	"Burritos",
	"Clacoyos",
	"Hot-Dogs",
	"Quesadillas",
	"Zopes",
	"Enchiladas",
	"Tamales"
]

const randomValue = () => {
	const value = values[Math.floor(Math.random() * values.length)];
	console.log(value)
};

module.exports = { randomValue }