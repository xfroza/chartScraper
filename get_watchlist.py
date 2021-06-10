from futu import *
quote_ctx = OpenQuoteContext(host='127.0.0.1', port=11111)
# ---
ret, data = quote_ctx.get_user_security("observing")
if ret == RET_OK:
    print(data)
    # print(data['code'].values.tolist())
else:
    print('error:', data)
# ---
quote_ctx.close()

# get short symbol from code
dataList = [v.split(".", 1)[1] for v in data['code'].values.tolist()]
# convert list to json
with open('watchlist-data.json', 'w') as output:
    json.dump(dataList, output)
